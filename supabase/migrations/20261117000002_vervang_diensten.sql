-- Diensten in een periode in één transactie vervangen (voor "vul vanuit sjabloon" / "kopieer" met vervangen).
-- security invoker: RLS blijft gelden; extra check zodat de foutmelding duidelijk is.
create or replace function public.vervang_diensten(p_van date, p_tot date, p_diensten jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  n integer;
begin
  if not public.is_admin() then
    raise exception 'Alleen de beheerder mag het rooster wijzigen.' using errcode = '42501';
  end if;
  if p_tot < p_van or p_tot - p_van > 31 then
    raise exception 'Ongeldige periode.';
  end if;
  delete from public.diensten where datum between p_van and p_tot;
  insert into public.diensten (zorgverlener_id, datum, type, start_tijd, eind_tijd, notitie)
  select (r ->> 'zorgverlener_id')::uuid,
         (r ->> 'datum')::date,
         r ->> 'type',
         (r ->> 'start_tijd')::time,
         (r ->> 'eind_tijd')::time,
         nullif(r ->> 'notitie', '')
    from jsonb_array_elements(coalesce(p_diensten, '[]'::jsonb)) as r
   where (r ->> 'datum')::date between p_van and p_tot;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.vervang_diensten(date, date, jsonb) from public, anon;
grant execute on function public.vervang_diensten(date, date, jsonb) to authenticated;
