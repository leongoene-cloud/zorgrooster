-- Seed-data: schoolvakanties regio Midden + beheerder + 2 testzorgverleners.
-- Pas het e-mailadres van de beheerder aan vóórdat je dit draait!

insert into public.zorgverleners (naam, email, kleur, rol) values
  ('Leon', 'admin@example.com', '#1d4ed8', 'admin'),
  ('Anna (test)', 'anna@example.com', '#be185d', 'zorgverlener'),
  ('Bram (test)', 'bram@example.com', '#047857', 'zorgverlener')
on conflict do nothing;

insert into public.schoolvakanties (naam, start_datum, eind_datum, regio, bron, opmerking) values
  ('Kerstvakantie 2026',     '2026-12-19', '2027-01-03', 'midden', 'rijksoverheid.nl', null),
  ('Voorjaarsvakantie 2027', '2027-02-20', '2027-02-28', 'midden', 'rijksoverheid.nl (adviesdata)', null),
  ('Meivakantie 2027',       '2027-04-24', '2027-05-02', 'midden', 'rijksoverheid.nl', 'scholen kunnen uitbreiden t/m 9 mei 2027'),
  ('Zomervakantie 2027',     '2027-07-17', '2027-08-29', 'midden', 'rijksoverheid.nl', null),
  ('Herfstvakantie 2027',    '2027-10-16', '2027-10-24', 'midden', 'rijksoverheid.nl (adviesdata)', null),
  ('Kerstvakantie 2027',     '2027-12-25', '2028-01-09', 'midden', 'rijksoverheid.nl', null),
  ('Voorjaarsvakantie 2028', '2028-02-26', '2028-03-05', 'midden', 'rijksoverheid.nl (adviesdata)', null);
