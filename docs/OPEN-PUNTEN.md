# Open punten GatVuller (bijgewerkt 29-09-2026)

Branch `feat/mvp-afwerking`, PR #4. Niet gemerged naar `main`; productie draait nog de oude versie. De featurebranch is gepusht. Controleer de CI- en Vercel-status van de laatste commit afzonderlijk voordat je een release overweegt.

Laatste controle: zowel preview als productie antwoorden met HTTP 503 op `/api/health`. Daarom is productie nog niet veilig vrij te geven. De lokale TypeScript-, lint- en 52 unit-/integratietests slagen; daarnaast slagen 32 desktop-/mobiele browser-smoketests. Deze rooktests controleren publieke pagina's, taal, SEO-respons en headers, maar bewijzen niet dat de productieboekingsflow werkt. De Next-productiebuild slaagde lokaal; `prisma generate` kon op Windows eenmaal de vergrendelde engine niet vervangen. CI gebruikt een schone Linux-runner.

## Blokkade productie (gecontroleerd, alleen lezend)
1. **De database is onbereikbaar.** `DATABASE_URL` in Vercel (production, preview en development, dezelfde waarde) wijst naar Prisma Postgres `db.prisma.io:5432`.
   - `/api/health` op productie geeft `P1001 Can't reach database server`. Hetzelfde geldt vanaf een lokale machine met dezelfde URL; de host antwoordt wel op TCP.
   - De database lijkt dus verwijderd of geblokkeerd. Controleer dat in console.prisma.io.
2. **Geen Supabase-project voor GatVuller.** Geen enkel project in het Supabase-account hoort bij GatVuller, en er zijn geen Supabase-variabelen in Vercel. De app gebruikt ook geen Supabase Auth: inloggen loopt via Auth.js met e-mail en wachtwoord.
3. **Ontbrekende Vercel-variabelen:** `DIRECT_URL`, `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL` en `NEXT_PUBLIC_COMPANY_*`. `STRIPE_SECRET_KEY` en `STRIPE_WEBHOOK_SECRET` staan op `REPLACE_ME`.
4. **Preview en productie delen `DATABASE_URL`.** Geef preview een eigen database.

Zolang punt 1 open is, zou een merge naar `main` niets herstellen. De nieuwe code verwacht bovendien de migraties op een werkende database.

## Wat Bob moet doen, in deze volgorde
1. **Database.** Herstel de Prisma Postgres-database, of maak een nieuwe aan (Supabase EU: pooler op poort 6543 met `?pgbouncer=true&connection_limit=1` als `DATABASE_URL`, session/direct op poort 5432 als `DIRECT_URL`). Zet beide in Vercel (production), en een aparte database voor preview.
2. **Migraties.** Controleer eerst een backup en `prisma migrate status` met de productie-`DIRECT_URL`, zonder secrets te tonen. Gebruik daarna de handmatige GitHub Action **Database migrations** (met het juiste production-secret en goedkeuring), of voer `prisma migrate deploy` gecontroleerd uit in een vertrouwde omgeving. Test of de oude productiecode de migraties verdraagt voordat de nieuwe code naar `main` gaat. Seed nooit productie.
3. **Stripe:** Connect Express aanzetten, de sleutels in Vercel zetten en de webhooks aanmaken volgens `DEPLOY.md`. Zet geen vertraagde betaalmethoden aan (SEPA). Optioneel: `STRIPE_PAYMENT_METHODS=card,bancontact`.
4. **E-mail:** een Resend-account, het domein verifiëren (SPF/DKIM) en `RESEND_API_KEY` plus `EMAIL_FROM` instellen.
5. **Domein:** in Vercel toevoegen, daarna `AUTH_URL` en `NEXT_PUBLIC_APP_URL` op het nieuwe domein zetten.
6. **Vrijgeven:** `CRON_SECRET`, de bedrijfsgegevens (`NEXT_PUBLIC_COMPANY_*`), werkende healthcheck, groene CI en geslaagde kernflows. Volg de releasevolgorde in `DEPLOY.md` en merge daarna pas PR #4. Rooktest:
   - `/api/health` geeft `ok`;
   - een zaak registreert, wordt goedgekeurd en koppelt Stripe;
   - een kleine live betaling, die je daarna terugbetaalt.

## Klaar in deze ronde
- **Beveiliging:**
  - geen XSS meer via de JSON-LD;
  - geen open redirect meer (`/<TAB>/evil.com`);
  - rollen komen uit de database, en een wachtwoordreset beëindigt oude sessies;
  - de seed-admin werkt nooit op een productiebuild;
  - rate limits kunnen in productie niet uit;
  - foto-uploads worden op hun bytes gecontroleerd;
  - meldingen vragen opnieuw bevestiging;
  - ICS-bestanden zijn geëscaped;
  - het contactformulier geeft een eerlijke status.
- **Boekingen en betalingen:**
  - de annuleringstermijn staat vast op de boeking (nieuwe migratie `20260929080000_booking_policy_snapshot`);
  - vastgelopen holds worden eerst vrijgegeven;
  - maximaal twee open holds per klant;
  - een te late betaling wordt terugbetaald;
  - idempotente refunds en checkouts;
  - no-show en check-in onder lock;
  - een aanbod bewerken of intrekken gebeurt onder lock, en de cron herhaalt mislukte refunds.
- **Klant en zaak:**
  - alle tijden in Brusselse tijd (op Vercel stonden ze in UTC);
  - foutmeldingen in drie talen in plaats van codes;
  - lijsten tonen alleen de niche (beauty in Antwerpen);
  - een verborgen review telt niet meer mee;
  - een bevestiging voor het intrekken van een aanbod;
  - merk-icoon en PWA-manifest.
- **Controles (laatste lokale run):** TypeScript, lint, 52 vitest-tests en 32 publieke desktop-/mobiele browser-smoketests groen. De Next-productiebuild slaagde; een volledige verse Windows-build inclusief `prisma generate` moet nog opnieuw na het vrijmaken van de vergrendelde engine. De eerdere boekingsflow-test is geen vervanging voor een herhaling tegen de uiteindelijke productieconfiguratie.
- **Lanceervideo:** `brag-output/brag.mp4` met poster en deeltekst. Die map staat niet in git.

## Historische auditpunten om opnieuw te verifiëren

De lijst hieronder komt uit een eerdere audit en is niet opnieuw punt voor punt gevalideerd na de latere commits. Sommige punten kunnen al opgelost zijn. Controleer de actuele code en voeg gerichte tests toe voordat je ze als open of gesloten markeert.
1. **Voucherpagina:** toon de juiste weergave per status. Nu staan er code en QR bij onbetaalde of terugbetaalde boekingen, en een afgebroken betaling heeft geen eigen melding.
2. **Stripe-annulering:** de statuspagina geeft bij `afgebroken=1` de plek nog niet direct vrij. Dat gebeurt nu pas via de webhook of de hold van 37 minuten. De poller moet ook afbouwen en stoppen.
3. **Mobiele `/slots`:** de filters vullen het hele eerste scherm. Maak ze inklapbaar. Er ontbreekt ook navigatie tussen 768 en 1023 px, en account en dashboard zijn niet bereikbaar op een telefoon.
4. **Dashboard:**
   - de boekingenlijst begint bij de oudste; zet vandaag en komend eerst;
   - toon de zichtbaarheid per aanbod (`slotVisibility` bestaat al);
   - een formulier om een aanbod te bewerken (de PATCH bestaat);
   - KPI's per periode.
5. **Resterende vertaling:** dashboard, admin en een deel van de klantpagina's zijn nog hard-coded Nederlands. `/impact` toont niet-gefilterde cijfers: verwijder de pagina of beperk ze tot LIVE.
6. **Schorsen:** bij het schorsen van een zaak worden komende betaalde boekingen nog niet terugbetaald of verwittigd.
7. **Tests:** e2e met Edge (`channel: "msedge"`, zonder browserdownload), plus integratietests op `TEST_DATABASE_URL` voor de webhook tot en met markPaid, een te late betaling en het intrekken van een aanbod met meerdere boekingen.
8. **Dependencies:** `npm audit` meldt nog advisories die alleen met een major upgrade van Next of Prisma verdwijnen.

De volledige auditlijst (164 bevindingen) zit in de workflow-journal van deze sessie. Punt 1 tot en met 4 geven de meeste winst.
