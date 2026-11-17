-- Zorgverleners zien elkaars openstaande en goedgekeurde verlof (zonder reden),
-- van vandaag en later. Alleen met een geldige persoonlijke link.
create or replace function public.zv_verlof_team(p_token text)
returns table (id uuid, zorgverlener_id uuid, start_datum date, eind_datum date, status text)
language sql volatile security definer set search_path = public
as $$
  select v.id, v.zorgverlener_id, v.start_datum, v.eind_datum, v.status
    from public.verlof_aanvragen v
   where public.zv_uit_token(p_token) is not null
     and v.status in ('aangevraagd', 'goedgekeurd')
     and v.eind_datum >= (now() at time zone 'Europe/Amsterdam')::date
   order by v.start_datum, v.eind_datum
$$;

revoke all on function public.zv_verlof_team(text) from public;
grant execute on function public.zv_verlof_team(text) to anon, authenticated;
