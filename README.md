# Zorgrooster

Web-app waarin zorgverleners het maandrooster bekijken en verlof aanvragen, en de beheerder het rooster, verlof, vervanging en uren regelt. Vervangt het Excel-rooster.

- **Next.js 16** (App Router, TypeScript, Tailwind 4) — hosting op Vercel
- **Supabase** — Postgres, Row Level Security; beheerder logt in met wachtwoord, zorgverleners met een persoonlijke link
- Interface in het Nederlands, tijdzone Europe/Amsterdam, weken beginnen op maandag
- Beheerschermen geschikt voor oogbesturing: klikdoelen ≥ 56 px, alleen tekstknoppen, geen hover-menu's, geen slepen, geen dubbelklik, geen tijdslimieten; verwijderen gaat in twee stappen

## Wat zit erin

| Tab | Voor wie | Inhoud |
|---|---|---|
| Rooster | iedereen | Maandkalender (op telefoon een lijst per dag), filter per persoon in de URL (`?zv=…&maand=2026-12`), knop *Mijn diensten* met totaal diensten en uren, schoolvakanties gearceerd, goedgekeurd verlof als label, export naar agenda (.ics) |
| Verlof | iedereen | Verlof aanvragen (waarschuwt bij eigen diensten en schoolvakanties), eigen aanvragen met status en annuleren. Beheerder: beoordelen (goedkeuren/afkeuren met opmerking) en historie met filters. Schoolvakanties regio Midden voor de komende 12 maanden |
| Beheer | beheerder | Rooster bewerken (klik op dag → formulier met datum ingevuld), weeksjabloon + *Vul maand vanuit sjabloon*, *Kopieer vorige week/maand* (altijd eerst een voorbeeld), controles (dubbele/overlappende diensten, dienst tijdens verlof, dagen zonder dagdienst of zonder nachtdienst), vervanging na goedgekeurd verlof, zorgverleners, urenoverzicht + Excel-export, eenmalige import uit Excel/CSV, schoolvakanties, wijzigingslog |

**Uren:** per dienst afgerond op kwartieren; een dienst waarvan de eindtijd ≤ begintijd is loopt door tot de volgende dag (21:00–09:00 = 12 uur, ook in de nacht van de zomer/wintertijdwissel). Werkelijke tijden (bijv. uitloop) gaan vóór de geplande tijden. Een dienst telt mee in de maand waarin hij begint.

**Na goedkeuring van verlof** worden de diensten van die persoon in de periode gemarkeerd als *Vervanging nodig* (rood in de kalender) en zie je direct de lijst met per dienst *Wijs andere zorgverlener toe*. De keuzelijst laat zien wie beschikbaar is.

## Inloggen

- **Zorgverleners** hebben geen account, wachtwoord of e-mail nodig. Ze krijgen van de beheerder een **persoonlijke link** (bijv. via WhatsApp). Die opent hun eigen diensten; daarna onthoudt de telefoon de toegang (ruim een jaar, elk gebruik van de link verlengt dit). Tip: zet de pagina op het beginscherm.
- **De beheerder** logt in met **alleen een wachtwoord** (het bijbehorende e-mailadres staat in `ADMIN_EMAIL` op de server). Op je eigen computer blijf je ingelogd.
- Link kwijt of telefoon gestolen? *Beheer → Zorgverleners → naam → Nieuwe link maken*: de oude link werkt dan meteen niet meer. *Link intrekken* of *Gedeactiveerd* sluit iemand helemaal af.

## Installeren

### 1. Supabase

1. Maak een project aan op [supabase.com](https://supabase.com) (regio EU, bijv. Frankfurt).
2. Open **SQL Editor** en voer achtereenvolgens uit:
   - `supabase/migrations/20261117000001_schema.sql`
   - `supabase/migrations/20261117000002_vervang_diensten.sql`
   - `supabase/migrations/20261117000003_persoonlijke_links.sql`
   - `supabase/seed.sql` — **verander eerst `admin@example.com` in je eigen e-mailadres** en haal de testzorgverleners weg als je die niet wilt.
3. **Authentication → Users → Add user → Create new user**: vul hetzelfde e-mailadres in, kies je beheerwachtwoord en vink *Auto Confirm User* aan.
4. **Authentication → Sign In / Providers**: zet *Allow new users to sign up* **uit**. Zo kan niemand anders een account aanmaken.
5. Noteer onder **Project Settings → API** de *Project URL* en de *publishable key* (of *anon key*).

E-mailinstellingen (templates, SMTP) zijn niet nodig: de app verstuurt geen e-mail.

### 2. Lokaal draaien

```bash
cp .env.example .env.local   # en vul de waarden in
npm install
npm run dev
```

### 3. Deploy naar Vercel

1. Importeer de GitHub-repository in Vercel.
2. Voeg bij *Environment Variables* toe: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` (het Vercel-adres) en `ADMIN_EMAIL`.
3. Deploy. Weet je het adres pas na de eerste deploy, vul dan `NEXT_PUBLIC_SITE_URL` in en kies *Redeploy*.

### 4. Aan de slag

1. Ga naar het adres van de app en log in met je wachtwoord.
2. **Beheer → Zorgverleners**: voeg iedereen toe (naam en kleur; e-mail is niet nodig). Klik op een naam → **Persoonlijke link maken** → **Stuur via WhatsApp**.
3. **Beheer → Import**: zet eenmalig het huidige Excel-rooster over (kolommen `datum, naam, type, start, eind`; meerdere tabbladen mag; voorbeeld in `public/import-voorbeeld.csv`).
4. **Beheer → Weeksjabloon**: leg het vaste weekpatroon vast en vul daarmee voortaan elke maand.

## Beveiliging

De echte beveiliging zit in de database, niet in de interface:

- De beheerder werkt via Row Level Security: alleen een ingelogde, actieve beheerder mag schrijven.
- Een persoonlijke link is een willekeurige code van 64 tekens. In de database staat alleen de hash ervan. Bezoekers zonder wachtwoord hebben géén toegang tot de tabellen; ze kunnen alleen een paar databasefuncties aanroepen die bij elke aanroep de code controleren. Met een geldige code kun je uitsluitend: het rooster, namen/kleuren, schoolvakanties en goedgekeurd verlof (zonder reden) lezen, en je **eigen** verlof aanvragen (altijd status *aangevraagd*) en annuleren zolang het open staat.
- De link-code staat op de telefoon in een beveiligde cookie (niet leesbaar voor scripts).
- Elke wijziging komt via triggers in het wijzigingslog, ook verlof dat via een persoonlijke link is aangevraagd.

## Tests

```bash
npm test             # rekenlogica: datums, uren, controles, sjabloon/kopiëren, import, .ics, Excel
npm run typecheck
npm run lint
```

RLS-tests tegen een echte Postgres 16 met dezelfde migraties (zonder Docker):

```bash
scripts/test-db/start.sh   # start een tijdelijke Postgres op poort 54329 met schema + seed
npm run test:db            # 25 tests: rechten van beheerder, links en anonieme bezoekers, verlof, auditlog
```

## Instellingen in de code

- Standaardtijden per diensttype (dag 12:00–16:00, nacht 21:00–09:00): `src/lib/types.ts` (`DIENST_TYPES`).
- Controle op gaten (elke dag een dag- én een nachtdienst): `src/lib/controles.ts`.
- Kleuren voor zorgverleners: `src/app/(app)/beheer/zorgverleners/zv-formulier.tsx`.

## Later

- E-mail naar de beheerder bij een nieuwe aanvraag en naar de zorgverlener bij een besluit (Supabase Edge Function + Resend).
- Melding aan een zorgverlener bij een nieuwe of gewijzigde dienst.
