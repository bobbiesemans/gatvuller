# Overdracht GatVuller (29-09-2026)

Repo: `bobbiesemans/gatvuller`, lokaal `C:\Users\bobbi\Documents\gatvuller`, branch `feat/mvp-afwerking` (PR #4).
GatVuller staat in een eigen repository en heeft niets met aiskillproof te maken. Lees ook `docs/OPEN-PUNTEN.md` en `DEPLOY.md`.

## Wat er gedaan is (lokaal gecommit, NIET gepusht)
- RLS-migratie op alle tabellen plus test (werk van het teamlid, nu gecommit en toegepast).
- Tests draaien alleen op `TEST_DATABASE_URL` en weigeren een niet-lokale database.
- Favicon/PNG-iconen en manifest (elke pagina gaf een 404 op `/favicon.ico`).
- `scripts/qa/shot.mjs`: screenshots in Edge, ingelogd als seed-rol, per taal en schermgrootte (gebruik `MSYS_NO_PATHCONV=1` in Git Bash).
- `scripts/qa/fake-stripe.mjs`: lokale Stripe-nabootsing (Checkout met Connect, refunds, accounts, ondertekende webhooks). De app gebruikt die alleen met een testsleutel en `STRIPE_API_URL` op localhost.
- `src/lib/payments.integration.test.ts`: 14 tests op echte database plus nep-Stripe: commissie en prijs uit de database, idempotente webhooks, redirect telt niet, te late of afwijkende betaling wordt terugbetaald, dubbel annuleren = één refund, aanbod intrekken met meerdere boekingen, gelijktijdige boekingen, cron-geheim. Allemaal groen.
- Beveiliging: constante-tijd login (geen e-mail-enumeratie via timing) en Origin-controle op alle schrijvende API-routes (`src/lib/api.ts`, met test).
- e2e-opzet: `playwright.config.ts` (Edge, geen download) en `scripts/qa/e2e-server.mjs` (aparte e2e-database, nep-Stripe, app op poort 3011). `e2e/smoke.spec.ts` is geschreven maar nog NIET succesvol gedraaid. Oude `e2e/mvp.spec.ts` verwijderd.
- Basis was groen vóór de UI-slag: tsc, lint, 15 tests, productiebuild.

## Onafgemaakt werk in de werkmap (laatste commit "WIP")
Vier hulp-agents werkten parallel en zijn halverwege gestopt. Hun bestanden staan in de WIP-commit en zijn NIET gecontroleerd: `tsc` geeft nog 3 fouten (o.a. `dashboard/page.tsx` verwacht `status` in de zaaklijst, `slots-browse.tsx` geeft een onbekende prop `favorite` aan `SlotCard`), `/impact` is half verwijderd, en de vertaalbestanden `messages/*/{dashboard,customer,booking,site}.json` zijn deels gevuld. Controleer met `npx tsc --noEmit`, `npm run lint`, `npx vitest run` en kijk alles na met `shot.mjs`.

## Nog te doen (volgorde)
1. `tsc`, lint, tests groen krijgen op de WIP-bestanden; niets weggooien zonder te kijken.
2. Vertalen NL/FR/EN afmaken: dashboard, admin, salonpagina, stad/categorie, login/register/account/contact, foutpagina's, metadata. Elke pagina met `formatEuro(x, locale)` en `formatInZone` (nu tonen sommige prijzen Nederlandse notatie in FR/EN).
3. Mobiel: `/slots` filters inklapbaar, navigatie tussen 768 en 1023 px, account/dashboard bereikbaar op telefoon, homepage met echte samenvatting boven de vouw.
4. Dashboard: boekingen met vandaag/komend eerst, zichtbaarheid per aanbod (`slotVisibility`), bewerkformulier, KPI's per periode.
5. `/impact` verwijderen met redirect naar `/` (next.config.ts).
6. e2e-specs schrijven en draaien (registratie/login, aanbod publiceren, boeken via nep-Stripe, annuleren, autorisatie, mobiel); route-autorisatietests.
7. Dependencies: `overrides` voor `next`→`postcss` 8.5.28 en `@prisma/config`→`deepmerge-ts` 8.x proberen, daarna build en tests; `db:push`/`db:setup` uit package.json halen.
8. README en DEPLOY.md bijwerken (Supabase: gepoolde `DATABASE_URL` poort 6543, `DIRECT_URL` via session pooler omdat GitHub Actions geen IPv6 heeft; Data API voor het public schema uitzetten).
9. Pas na jouw akkoord pushen.

## Voor jou (extern)
- Productie-database: de Vercel-`DATABASE_URL` wijst naar Prisma Postgres (onbereikbaar) en er bestaat geen Supabase-project voor GatVuller. Een nieuw project kan geld kosten; dat heb ik niet aangemaakt.
- Stripe Connect activeren, sleutels en twee webhooks (zie DEPLOY.md), Resend-domein, `CRON_SECRET`, `NEXT_PUBLIC_COMPANY_*`, domein en `AUTH_URL`.
- Niets is gepusht of gedeployed sinds de eerdere push van PR #4.
