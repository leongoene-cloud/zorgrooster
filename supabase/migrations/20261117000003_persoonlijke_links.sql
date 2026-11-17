-- Persoonlijke links voor zorgverleners (geen e-mail, geen wachtwoord).
-- Een zorgverlener heeft geen Supabase-account: de app roept onderstaande functies aan
-- met de geheime link-code. De database controleert de code bij elke aanroep, dus een
-- link geeft nooit meer toegang dan: rooster bekijken + eigen verlof aanvragen/annuleren.
-- Alleen de beheerder logt in (Supabase Auth, wachtwoord) en gebruikt de tabellen direct via RLS.

alter table public.zorgverleners
  add column toegang_hash text unique,
  add column toegang_aangemaakt timestamptz,
  alter column email drop not null; -- alleen de beheerder heeft een e-mailadres nodig

alter table public.zorgverleners
  add constraint admin_heeft_email check (rol <> 'admin' or email is not null);

-- Zorgverlener-acties in het wijzigingslog herkenbaar maken
alter table public.audit_log add column zorgverlener_id uuid null;

create or replace function public.audit_trigger()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.audit_log (user_id, zorgverlener_id, tabel, actie, oud, nieuw)
  values (
    auth.uid(),
    nullif(current_setting('app.zorgverlener_id', true), '')::uuid,
    tg_table_name,
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Hulpfuncties
-- ---------------------------------------------------------------------------

create or replace function public.token_hash(p_token text)
returns text
language sql immutable
as $$ select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex') $$;

/** Actieve zorgverlener bij een link-code, of null. Zet ook de context voor het wijzigingslog. */
create or replace function public.zv_uit_token(p_token text)
returns uuid
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_token is null or length(p_token) < 32 then
    return null;
  end if;
  select id into v_id from public.zorgverleners
   where toegang_hash = public.token_hash(p_token) and actief;
  if v_id is not null then
    perform set_config('app.zorgverlener_id', v_id::text, true);
  end if;
  return v_id;
end;
$$;

revoke all on function public.zv_uit_token(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Beheerder: link aanmaken / intrekken
-- ---------------------------------------------------------------------------

create or replace function public.nieuwe_toegangslink(p_zorgverlener_id uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if not public.is_admin() then
    raise exception 'Alleen de beheerder' using errcode = '42501';
  end if;
  update public.zorgverleners
     set toegang_hash = public.token_hash(v_token), toegang_aangemaakt = now()
   where id = p_zorgverlener_id;
  if not found then
    raise exception 'Zorgverlener niet gevonden';
  end if;
  return v_token; -- wordt alleen nu getoond; in de database staat alleen de hash
end;
$$;

create or replace function public.trek_toegangslink_in(p_zorgverlener_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Alleen de beheerder' using errcode = '42501';
  end if;
  update public.zorgverleners set toegang_hash = null, toegang_aangemaakt = null where id = p_zorgverlener_id;
end;
$$;

revoke all on function public.nieuwe_toegangslink(uuid), public.trek_toegangslink_in(uuid) from public, anon;
grant execute on function public.nieuwe_toegangslink(uuid), public.trek_toegangslink_in(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Zorgverlener (met link-code): alleen lezen + eigen verlof
-- ---------------------------------------------------------------------------

create or replace function public.zv_sessie(p_token text)
returns table (id uuid, naam text, kleur text)
language sql volatile security definer set search_path = public
as $$
  select z.id, z.naam, z.kleur from public.zorgverleners z where z.id = public.zv_uit_token(p_token)
$$;

create or replace function public.zv_zorgverleners(p_token text)
returns table (id uuid, naam text, kleur text, actief boolean)
language sql volatile security definer set search_path = public
as $$
  select z.id, z.naam, z.kleur, z.actief from public.zorgverleners z
   where public.zv_uit_token(p_token) is not null
   order by z.naam
$$;

create or replace function public.zv_diensten(p_token text, p_van date, p_tot date, p_zorgverlener_id uuid default null)
returns setof public.diensten
language sql volatile security definer set search_path = public
as $$
  select d.* from public.diensten d
   where public.zv_uit_token(p_token) is not null
     and d.datum between p_van and p_tot
     and (p_zorgverlener_id is null or d.zorgverlener_id = p_zorgverlener_id)
   order by d.datum, d.start_tijd
$$;

create or replace function public.zv_verlof_goedgekeurd(p_token text, p_van date, p_tot date)
returns table (id uuid, zorgverlener_id uuid, start_datum date, eind_datum date)
language sql volatile security definer set search_path = public
as $$
  select v.id, v.zorgverlener_id, v.start_datum, v.eind_datum from public.verlof_aanvragen v
   where public.zv_uit_token(p_token) is not null
     and v.status = 'goedgekeurd' and v.start_datum <= p_tot and v.eind_datum >= p_van
$$;

create or replace function public.zv_vakanties(p_token text, p_van date, p_tot date, p_regio text default 'midden')
returns setof public.schoolvakanties
language sql volatile security definer set search_path = public
as $$
  select s.* from public.schoolvakanties s
   where public.zv_uit_token(p_token) is not null
     and s.regio = p_regio and s.start_datum <= p_tot and s.eind_datum >= p_van
   order by s.start_datum
$$;

create or replace function public.zv_mijn_verlof(p_token text)
returns setof public.verlof_aanvragen
language sql volatile security definer set search_path = public
as $$
  select v.* from public.verlof_aanvragen v
   where v.zorgverlener_id = public.zv_uit_token(p_token)
   order by v.start_datum desc
$$;

create or replace function public.zv_verlof_aanvragen(p_token text, p_start date, p_eind date, p_reden text default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_zv uuid := public.zv_uit_token(p_token);
  v_id uuid;
begin
  if v_zv is null then
    raise exception 'Deze link is niet (meer) geldig.' using errcode = '42501';
  end if;
  if p_eind < p_start then
    raise exception 'De einddatum mag niet vóór de startdatum liggen.';
  end if;
  insert into public.verlof_aanvragen (zorgverlener_id, start_datum, eind_datum, reden, status)
  values (v_zv, p_start, p_eind, nullif(left(trim(p_reden), 500), ''), 'aangevraagd')
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.zv_verlof_annuleren(p_token text, p_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_zv uuid := public.zv_uit_token(p_token);
begin
  if v_zv is null then
    raise exception 'Deze link is niet (meer) geldig.' using errcode = '42501';
  end if;
  update public.verlof_aanvragen set status = 'geannuleerd'
   where id = p_id and zorgverlener_id = v_zv and status = 'aangevraagd';
  return found;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'zv_sessie(text)', 'zv_zorgverleners(text)', 'zv_diensten(text, date, date, uuid)',
    'zv_verlof_goedgekeurd(text, date, date)', 'zv_vakanties(text, date, date, text)',
    'zv_mijn_verlof(text)', 'zv_verlof_aanvragen(text, date, date, text)', 'zv_verlof_annuleren(text, uuid)'
  ] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

-- De e-mailcontrole voor de oude inloglink is niet meer nodig voor anonieme bezoekers
revoke execute on function public.email_toegestaan(text) from anon;
