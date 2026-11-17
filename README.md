# Zorgrooster

Web-app waarin zorgverleners het maandrooster bekijken en verlof aanvragen, en de beheerder het rooster, verlof, vervanging en uren regelt. Vervangt het Excel-rooster.

- **Next.js 16** (App Router, TypeScript, Tailwind 4) — hosting op Vercel
- **Supabase** — Postgres, inloggen met magic link/code, Row Level Security
- Interface in het Nederlands, tijdzone Europe/Amsterdam, weken beginnen op maandag
- Beheerschermen geschikt voor oogbesturing: klikdoelen ≥ 56 px, alleen tekstknoppen, geen hover-menu's, geen slepen, geen dubbelklik, geen tijdslimieten; verwijderen gaat in twee stappen

## Wat zit erin

| Tab | Voor wie | Inhoud |
|---|---|---|
| Rooster | iedereen | Maandkalender (op telefoon een lijst per dag), filter per persoon in de URL (`?zv=…&maand=2026-12`), knop *Mijn diensten* met totaal diensten en uren, schoolvakanties gearceerd, goedgekeurd verlof als label, export naar agenda (.ics) |
| Verlof | iedereen | Verlof aanvragen (waarschuwt bij eigen diensten en schoolvakanties), eigen aanvragen met status en annuleren. Beheerder: beoordelen (goedkeuren/afkeuren met opmerking) en historie met filters. Schoolvakanties regio Midden voor de komende 12 maanden |
| Beheer | beheerder | Rooster bewerken (klik op dag → formulier met datum ingevuld), weeksjabloon + *Vul maand vanuit sjabloon*, *Kopieer vorige week/maand* (altijd eerst een voorbeeld), controles (dubbele/overlappende diensten, dienst tijdens verlof, gaten in dag 09–21 of nacht 21–09), vervanging na goedgekeurd verlof, zorgverleners, urenoverzicht + Excel-export, eenmalige import uit Excel/CSV, schoolvakanties, wijzigingslog |

**Uren:** per dienst afgerond op kwartieren; een dienst waarvan de eindtijd ≤ begintijd is loopt door tot de volgende dag (21:00–09:00 = 12 uur, ook in de nacht van de zomer/wintertijdwissel). Werkelijke tijden (bijv. uitloop) gaan vóór de geplande tijden. Een dienst telt mee in de maand waarin hij begint.

**Na goedkeuring van verlof** worden de diensten van die persoon in de periode gemarkeerd als *Vervanging nodig* (rood in de kalender) en zie je direct de lijst met per dienst *Wijs andere zorgverlener toe*. De keuzelijst laat zien wie beschikbaar is.

## Installeren

### 1. Supabase

1. Maak een project aan op [supabase.com](https://supabase.com) (regio EU, bijv. Frankfurt).
2. Open **SQL Editor** en voer achtereenvolgens uit:
   - `supabase/migrations/20261117000001_schema.sql`
   - `supabase/migrations/20261117000002_vervang_diensten.sql`
   - `supabase/seed.sql` — **verander eerst `admin@example.com` in je eigen e-mailadres** en haal de testzorgverleners weg als je die niet wilt.

   (Of met de Supabase CLI: `supabase link` en `supabase db push`, daarna de seed.)
3. **Authentication → Sign In / Providers → Email**: laat *Email* aan. *Allow new users to sign up* moet aan blijven: een database-trigger laat alleen e-mailadressen toe die in de tabel `zorgverleners` staan (geen open registratie).
4. **Authentication → URL Configuration**: zet *Site URL* op het adres van de app (bijv. `https://zorgrooster.vercel.app`) en voeg `https://zorgrooster.vercel.app/auth/confirm` toe bij *Redirect URLs* (en `http://localhost:3000/auth/confirm` voor lokaal).
5. **Authentication → Emails → Magic Link**: vervang de template, zodat de link ook werkt als iemand hem op een ander apparaat opent:

   ```html
   <h2>Inloggen bij het zorgrooster</h2>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Klik hier om in te loggen</a></p>
   <p>Of vul deze code in op de inlogpagina: <strong>{{ .Token }}</strong></p>
   ```

   Doe hetzelfde voor de template **Confirm signup** (die wordt gebruikt bij de allereerste keer inloggen).
6. Aanrader: stel onder **Authentication → Emails → SMTP Settings** een eigen mailserver in (bijv. Resend). De ingebouwde mail van Supabase is beperkt tot een paar berichten per uur.

### 2. Lokaal draaien

```bash
cp .env.example .env.local   # en vul de waarden in
npm install
npm run dev
```

### 3. Deploy naar Vercel

1. Zet de code in een GitHub-repository en importeer die in Vercel.
2. Voeg bij *Environment Variables* toe: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `NEXT_PUBLIC_SITE_URL`.
3. Deploy, en controleer dat de Site URL en Redirect URL in Supabase overeenkomen met het Vercel-adres.

### 4. Aan de slag

1. Log in met het beheerdersadres uit de seed.
2. **Beheer → Zorgverleners**: voeg iedereen toe met naam, e-mail en kleur. Wie je deactiveert kan niet meer inloggen; oude diensten en uren blijven bewaard.
3. **Beheer → Import**: zet eenmalig het huidige Excel-rooster over (kolommen `datum, naam, type, start, eind`; meerdere tabbladen mag; voorbeeld in `public/import-voorbeeld.csv`).
4. **Beheer → Weeksjabloon**: leg het vaste weekpatroon vast en vul daarmee voortaan elke maand.

## Beveiliging

De echte beveiliging zit in de database (Row Level Security), niet in de interface:

- Diensten, schoolvakanties en namen/kleuren: lezen voor ingelogde, actieve zorgverleners; schrijven alleen door de beheerder.
- E-mailadressen en rollen van anderen zijn niet zichtbaar voor zorgverleners (view `zorgverleners_publiek` toont alleen naam en kleur).
- Verlof: eigen aanvragen lezen, aanmaken (status wordt altijd *aangevraagd*, afgedwongen door een trigger) en annuleren zolang ze open staan. Goedgekeurd verlof van anderen is zichtbaar zonder reden (view `verlof_goedgekeurd`).
- Elke wijziging komt via triggers in `audit_log` (alleen leesbaar voor de beheerder).
- Nieuwe gebruikers worden geweigerd als hun e-mailadres niet in `zorgverleners` staat; de inlogpagina zegt niet of een adres bekend is.

## Tests

```bash
npm test             # rekenlogica: datums, uren, controles, sjabloon/kopiëren, import, .ics, Excel
npm run typecheck
npm run lint
```

RLS-tests tegen een echte Postgres 16 met dezelfde migraties (zonder Docker):

```bash
scripts/test-db/start.sh   # start een tijdelijke Postgres op poort 54329 met schema + seed
npm run test:db            # 19 tests: wat zorgverleners wel/niet mogen, verlof, registratie, auditlog
```

## Instellingen in de code

- Standaardtijden per diensttype: `src/lib/types.ts` (`DIENST_TYPES`).
- Welke uren gedekt moeten zijn (dag 09:00–21:00, nacht 21:00–09:00): `src/lib/controles.ts`.
- Kleuren voor zorgverleners: `src/app/(app)/beheer/zorgverleners/zv-formulier.tsx`.

## Later

- E-mail naar de beheerder bij een nieuwe aanvraag en naar de zorgverlener bij een besluit (Supabase Edge Function + Resend).
- Melding aan een zorgverlener bij een nieuwe of gewijzigde dienst.
