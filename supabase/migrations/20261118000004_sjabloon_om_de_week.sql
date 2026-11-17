-- Weeksjabloon: diensten die om de week terugkomen (bijv. zondagnacht Kimberly / Sheela).
-- 'even' en 'oneven' tellen weken vanaf maandag 3 januari 2000, zodat het ritme ook over
-- de jaargrens doorloopt (anders dan ISO-weeknummers, die bij week 53 → 1 twee keer oneven zijn).
alter table public.dienst_sjablonen
  add column if not exists ritme text not null default 'elke' check (ritme in ('elke', 'even', 'oneven'));
