-- Zorgrooster: schema, RLS-policies, triggers en auditlog.
-- Draai via `supabase db push` of plak in de SQL-editor van Supabase.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

create table public.zorgverleners (
  id uuid primary key default gen_random_uuid(),
  naam text not null check (length(trim(naam)) > 0),
  email text not null,
  kleur text not null default '#2563eb' check (kleur ~ '^#[0-9a-fA-F]{6}$'),
  actief boolean not null default true,
  rol text not null default 'zorgverlener' check (rol in ('admin', 'zorgverlener')),
  user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index zorgverleners_email_uniek on public.zorgverleners (lower(email));

create table public.diensten (
  id uuid primary key default gen_random_uuid(),
  zorgverlener_id uuid not null references public.zorgverleners (id) on delete restrict,
  datum date not null,
  type text not null check (type in ('dag', 'avond', 'nacht', 'overig')),
  start_tijd time not null,
  eind_tijd time not null,
  -- eind_tijd <= start_tijd betekent: eindigt de volgende dag (nachtdienst)
  werkelijke_start time null,
  werkelijke_eind time null,
  vervanging_nodig boolean not null default false,
  notitie text null,
  created_at timestamptz not null default now()
);
create index diensten_datum_idx on public.diensten (datum);
create index diensten_zv_datum_idx on public.diensten (zorgverlener_id, datum);

create table public.verlof_aanvragen (
  id uuid primary key default gen_random_uuid(),
  zorgverlener_id uuid not null references public.zorgverleners (id) on delete cascade,
  start_datum date not null,
  eind_datum date not null,
  reden text null,
  status text not null default 'aangevraagd'
    check (status in ('aangevraagd', 'goedgekeurd', 'afgekeurd', 'geannuleerd')),
  opmerking_admin text null,
  aangevraagd_op timestamptz not null default now(),
  beoordeeld_op timestamptz null,
  constraint verlof_periode_geldig check (eind_datum >= start_datum)
);
create index verlof_zv_idx on public.verlof_aanvragen (zorgverlener_id);
create index verlof_periode_idx on public.verlof_aanvragen (start_datum, eind_datum);

create table public.dienst_sjablonen (
  id uuid primary key default gen_random_uuid(),
  weekdag int not null check (weekdag between 1 and 7), -- 1 = maandag, 7 = zondag
  zorgverlener_id uuid not null references public.zorgverleners (id) on delete cascade,
  type text not null check (type in ('dag', 'avond', 'nacht', 'overig')),
  start_tijd time not null,
  eind_tijd time not null,
  created_at timestamptz not null default now()
);

create table public.schoolvakanties (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  start_datum date not null,
  eind_datum date not null,
  regio text not null default 'midden' check (regio in ('noord', 'midden', 'zuid')),
  bron text null,
  opmerking text null,
  constraint vakantie_periode_geldig check (eind_datum >= start_datum)
);

create table public.audit_log (
  id bigserial primary key,
  user_id uuid null,
  tabel text not null,
  actie text not null,
  oud jsonb null,
  nieuw jsonb null,
  tijd timestamptz not null default now()
);
create index audit_log_tijd_idx on public.audit_log (tijd desc);

-- ---------------------------------------------------------------------------
-- Hulpfuncties (security definer, zodat policies niet recursief worden)
-- ---------------------------------------------------------------------------

create or replace function public.mijn_zorgverlener_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.zorgverleners
  where user_id = auth.uid() and actief
  limit 1
$$;

create or replace function public.is_lid()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.zorgverleners where user_id = auth.uid() and actief
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.zorgverleners
    where user_id = auth.uid() and actief and rol = 'admin'
  )
$$;

-- Mag dit e-mailadres inloggen? (alleen actieve, door de admin toegevoegde adressen)
create or replace function public.email_toegestaan(p_email text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.zorgverleners
    where lower(email) = lower(trim(p_email)) and actief
  )
$$;

revoke all on function public.mijn_zorgverlener_id() from public;
revoke all on function public.is_lid() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.email_toegestaan(text) from public;
grant execute on function public.mijn_zorgverlener_id() to authenticated;
grant execute on function public.is_lid() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.email_toegestaan(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Koppeling auth.users <-> zorgverleners via e-mail; geen open registratie
-- ---------------------------------------------------------------------------

create or replace function public.koppel_nieuwe_gebruiker()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.email_toegestaan(new.email) then
    raise exception 'Dit e-mailadres heeft geen toegang tot het zorgrooster.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.koppel_gebruiker_na_aanmaak()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.zorgverleners
     set user_id = new.id
   where lower(email) = lower(new.email) and user_id is null;
  return new;
end;
$$;

create trigger auth_users_alleen_toegestaan
  before insert on auth.users
  for each row execute function public.koppel_nieuwe_gebruiker();

create trigger auth_users_koppel_zorgverlener
  after insert on auth.users
  for each row execute function public.koppel_gebruiker_na_aanmaak();

-- Als de admin een zorgverlener toevoegt of het e-mailadres wijzigt van iemand
-- die al een account heeft: koppel meteen.
create or replace function public.koppel_bestaande_gebruiker()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.user_id is null or (tg_op = 'UPDATE' and lower(new.email) <> lower(old.email)) then
    select u.id into new.user_id from auth.users u where lower(u.email) = lower(new.email) limit 1;
  end if;
  return new;
end;
$$;

create trigger zorgverleners_koppel
  before insert or update of email on public.zorgverleners
  for each row execute function public.koppel_bestaande_gebruiker();

-- ---------------------------------------------------------------------------
-- Verlof: een zorgverlener mag alleen aanvragen en annuleren
-- ---------------------------------------------------------------------------

create or replace function public.verlof_bewaking()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_admin() or auth.uid() is null then
    -- Admin (of service role / migratie): beoordeelmoment bijhouden
    if tg_op = 'UPDATE' and new.status is distinct from old.status
       and new.status in ('goedgekeurd', 'afgekeurd') then
      new.beoordeeld_op := now();
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'aangevraagd';
    new.opmerking_admin := null;
    new.beoordeeld_op := null;
    new.aangevraagd_op := now();
    return new;
  end if;

  -- UPDATE door een zorgverlener: alleen annuleren van een eigen open aanvraag
  if old.status <> 'aangevraagd' or new.status <> 'geannuleerd'
     or new.zorgverlener_id <> old.zorgverlener_id
     or new.start_datum <> old.start_datum
     or new.eind_datum <> old.eind_datum
     or new.reden is distinct from old.reden
     or new.opmerking_admin is distinct from old.opmerking_admin
     or new.aangevraagd_op <> old.aangevraagd_op
     or new.beoordeeld_op is distinct from old.beoordeeld_op then
    raise exception 'Je kunt alleen een eigen aanvraag annuleren die nog open staat.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger verlof_bewaking
  before insert or update on public.verlof_aanvragen
  for each row execute function public.verlof_bewaking();

-- Na goedkeuring: diensten in de verlofperiode markeren als "vervanging nodig".
create or replace function public.verlof_markeer_diensten()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'goedgekeurd' and (tg_op = 'INSERT' or old.status is distinct from 'goedgekeurd') then
    update public.diensten
       set vervanging_nodig = true
     where zorgverlener_id = new.zorgverlener_id
       and datum between new.start_datum and new.eind_datum;
  elsif tg_op = 'UPDATE' and old.status = 'goedgekeurd' and new.status <> 'goedgekeurd' then
    -- Verlof ingetrokken: markering weer weghalen
    update public.diensten
       set vervanging_nodig = false
     where zorgverlener_id = new.zorgverlener_id
       and datum between old.start_datum and old.eind_datum
       and vervanging_nodig;
  end if;
  return new;
end;
$$;

create trigger verlof_markeer_diensten
  after insert or update of status on public.verlof_aanvragen
  for each row execute function public.verlof_markeer_diensten();

-- Een dienst die aan iemand anders wordt toegewezen, is vervangen.
create or replace function public.dienst_vervangen()
returns trigger
language plpgsql
as $$
begin
  if new.zorgverlener_id <> old.zorgverlener_id and new.vervanging_nodig = old.vervanging_nodig then
    new.vervanging_nodig := false;
  end if;
  return new;
end;
$$;

create trigger dienst_vervangen
  before update on public.diensten
  for each row execute function public.dienst_vervangen();

-- ---------------------------------------------------------------------------
-- Wijzigingslog
-- ---------------------------------------------------------------------------

create or replace function public.audit_trigger()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.audit_log (user_id, tabel, actie, oud, nieuw)
  values (
    auth.uid(),
    tg_table_name,
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end;
$$;

create trigger audit_zorgverleners after insert or update or delete on public.zorgverleners
  for each row execute function public.audit_trigger();
create trigger audit_diensten after insert or update or delete on public.diensten
  for each row execute function public.audit_trigger();
create trigger audit_verlof after insert or update or delete on public.verlof_aanvragen
  for each row execute function public.audit_trigger();
create trigger audit_sjablonen after insert or update or delete on public.dienst_sjablonen
  for each row execute function public.audit_trigger();
create trigger audit_vakanties after insert or update or delete on public.schoolvakanties
  for each row execute function public.audit_trigger();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.zorgverleners enable row level security;
alter table public.diensten enable row level security;
alter table public.verlof_aanvragen enable row level security;
alter table public.dienst_sjablonen enable row level security;
alter table public.schoolvakanties enable row level security;
alter table public.audit_log enable row level security;

-- zorgverleners: eigen rij of admin. Naam en kleur van iedereen via de view hieronder.
create policy zv_lezen on public.zorgverleners for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy zv_admin_insert on public.zorgverleners for insert to authenticated
  with check (public.is_admin());
create policy zv_admin_update on public.zorgverleners for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy zv_admin_delete on public.zorgverleners for delete to authenticated
  using (public.is_admin());

-- diensten: iedere ingelogde zorgverlener leest, alleen admin schrijft
create policy diensten_lezen on public.diensten for select to authenticated
  using (public.is_lid());
create policy diensten_admin_insert on public.diensten for insert to authenticated
  with check (public.is_admin());
create policy diensten_admin_update on public.diensten for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy diensten_admin_delete on public.diensten for delete to authenticated
  using (public.is_admin());

-- verlof: eigen rijen lezen/aanmaken/annuleren; admin alles
create policy verlof_lezen on public.verlof_aanvragen for select to authenticated
  using (zorgverlener_id = public.mijn_zorgverlener_id() or public.is_admin());
create policy verlof_aanmaken on public.verlof_aanvragen for insert to authenticated
  with check (
    public.is_admin()
    or (zorgverlener_id = public.mijn_zorgverlener_id() and status = 'aangevraagd')
  );
create policy verlof_annuleren on public.verlof_aanvragen for update to authenticated
  using (
    public.is_admin()
    or (zorgverlener_id = public.mijn_zorgverlener_id() and status = 'aangevraagd')
  )
  with check (
    public.is_admin()
    or (zorgverlener_id = public.mijn_zorgverlener_id() and status = 'geannuleerd')
  );
create policy verlof_admin_delete on public.verlof_aanvragen for delete to authenticated
  using (public.is_admin());

-- sjablonen: alleen admin
create policy sjablonen_admin on public.dienst_sjablonen for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- schoolvakanties: iedereen (ingelogd) leest, admin schrijft
create policy vakanties_lezen on public.schoolvakanties for select to authenticated
  using (public.is_lid());
create policy vakanties_admin_insert on public.schoolvakanties for insert to authenticated
  with check (public.is_admin());
create policy vakanties_admin_update on public.schoolvakanties for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy vakanties_admin_delete on public.schoolvakanties for delete to authenticated
  using (public.is_admin());

-- auditlog: alleen admin leest; schrijven gebeurt uitsluitend via de trigger
create policy audit_admin_lezen on public.audit_log for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Views voor gedeelde informatie zonder gevoelige kolommen
-- (eigenaar = postgres, dus de view leest buiten RLS; filter staat in de view)
-- ---------------------------------------------------------------------------

create view public.zorgverleners_publiek
with (security_barrier = true)
as
  select id, naam, kleur, actief
  from public.zorgverleners
  where public.is_lid();

create view public.verlof_goedgekeurd
with (security_barrier = true)
as
  select id, zorgverlener_id, start_datum, eind_datum
  from public.verlof_aanvragen
  where status = 'goedgekeurd' and public.is_lid();

-- ---------------------------------------------------------------------------
-- Rechten
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on public.zorgverleners_publiek, public.verlof_goedgekeurd from anon, authenticated;
grant select on public.zorgverleners_publiek, public.verlof_goedgekeurd to authenticated;

grant select, insert, update, delete on
  public.zorgverleners, public.diensten, public.verlof_aanvragen,
  public.dienst_sjablonen, public.schoolvakanties
  to authenticated;
revoke insert, update, delete on public.audit_log from authenticated;
grant select on public.audit_log to authenticated;
