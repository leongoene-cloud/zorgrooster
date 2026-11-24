-- Werkbeschrijvingen: teksten die zorgverleners kunnen nalezen. Alleen de beheerder schrijft.
create table if not exists public.werkbeschrijvingen (
  id uuid primary key default gen_random_uuid(),
  titel text not null check (length(trim(titel)) > 0),
  inhoud text not null default '',
  volgorde integer not null default 0,
  bijgewerkt_op timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function public.zet_bijgewerkt_op()
returns trigger
language plpgsql
as $$
begin
  if new.titel is distinct from old.titel or new.inhoud is distinct from old.inhoud then
    new.bijgewerkt_op := now();
  end if;
  return new;
end;
$$;

drop trigger if exists werkbeschrijvingen_bijgewerkt on public.werkbeschrijvingen;
create trigger werkbeschrijvingen_bijgewerkt
  before update on public.werkbeschrijvingen
  for each row execute function public.zet_bijgewerkt_op();

drop trigger if exists audit_werkbeschrijvingen on public.werkbeschrijvingen;
create trigger audit_werkbeschrijvingen after insert or update or delete on public.werkbeschrijvingen
  for each row execute function public.audit_trigger();

alter table public.werkbeschrijvingen enable row level security;

drop policy if exists wb_admin on public.werkbeschrijvingen;
create policy wb_admin on public.werkbeschrijvingen for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.werkbeschrijvingen from anon;
grant select, insert, update, delete on public.werkbeschrijvingen to authenticated;

-- Zorgverleners lezen via hun persoonlijke link
create or replace function public.zv_werkbeschrijvingen(p_token text)
returns setof public.werkbeschrijvingen
language sql volatile security definer set search_path = public
as $$
  select w.* from public.werkbeschrijvingen w
   where public.zv_uit_token(p_token) is not null
   order by w.volgorde, w.titel
$$;

revoke all on function public.zv_werkbeschrijvingen(text) from public;
grant execute on function public.zv_werkbeschrijvingen(text) to anon, authenticated;
