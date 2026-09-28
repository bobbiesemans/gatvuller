# Open punten GatVuller (stand 28-09-2026)

Branch `feat/mvp-afwerking` (gepusht, niet gemerged naar `main`, niets gedeployed). Deploy-stappen en secrets staan in `DEPLOY.md`.

## Klaar en getest
- De build, typecheck, lint en tests zijn groen: 9 tests, waaronder gelijktijdige boekingen, annuleren met autorisatie, en webhook-signatuur en -idempotentie.
- De boekingsengine werkt met rowlocks en een tijdelijke betaalhold, idempotente betalingen, check-in en refunds. Een productieboeking wordt nooit PAID zonder bevestiging van Stripe.
- De webhook controleert alle signing secrets, is idempotent (StripeEvent) en verwerkt refunds, disputes en de Connect-status.
- Stripe Checkout met Connect-destination charges. De commissie wordt server-side berekend. Er is een uitbetalingspagina.
- Admin: zaken goedkeuren of schorsen, funnel-analytics, auditlog.
- Veiligheid:
  - migraties buiten de build (handmatige, goedgekeurde GitHub Action) en CI-workflow;
  - veilige seed;
  - rate limits met gehashte IP's;
  - strengere CSP;
  - geen datalekken via health of batch.
- AVG: accountpagina met export en anonimisering, opruiming via cron, meldingen met e-mailbevestiging.
- Testbanner per omgeving. De boekingsflow is mobiel doorlopen in de testmodus.

## Nog te doen (prioriteit)
1. **i18n van de UI.** Alleen de e-mails zijn in nl/fr/en; de schermen zijn nog Nederlands. Aanpak: next-intl zonder URL-prefix (cookie `NEXT_LOCALE`), `src/i18n/request.ts`, middleware die `?lang=` omzet naar de cookie.
2. **Designsysteem afwerken.** Tokens staan in `globals.css` (papier `#faf7f2`, inkt `#1d1b18`, baksteen `#b4492b`). Componenten en typografie moeten nog consistent gemaakt worden, en er is fotografie van zaken nodig (SalonPhoto-upload via Vercel Blob, `BLOB_READ_WRITE_TOKEN`).
3. **Klantflow:**
   - filters voor afstand en tijd in de URL;
   - de countdown per minuut in plaats van per seconde (`src/components/countdown.tsx`);
   - de slotpagina toont het boekingsformulier twee keer (mobiel en desktop), controleren;
   - een statuspagina die pollt terwijl de webhook nog niet binnen is;
   - `/boekingen` met tabbladen komend/voorbij;
   - favoriete zaken server-side via FavoriteSalon, in plaats van localStorage per slot;
   - een knop "meld dit aanbod" (Report-model bestaat al).
4. **QR-code** met een URL naar een check-in-pagina in het dashboard (`/dashboard/boekingen?code=`), zodat de gewone camera van de zaak volstaat.
5. **Dashboard:**
   - zaakprofiel en extra locaties bewerken;
   - sjablonen bewerken;
   - KPI's opsplitsen per betaalmodus (LIVE apart van test/demo);
   - no-show-knop (`markNoShow` bestaat al).
6. **Admin:** reviews verbergen, meldingen (Report) afhandelen, e-mail-outbox bekijken in de testmodus.
7. **Juridisch:** voorwaarden en privacy herschrijven met de verwerkers (Vercel, DB-host, Stripe, Resend, OSM-tiles), het annulerings- en no-showbeleid en de bedrijfsgegevens uit de env.
8. **SEO:**
   - stad×categoriepagina's;
   - JSON-LD per salontype;
   - `noindex` plus OG-afbeelding op slotpagina's;
   - referral-beloning als zakelijke beslissing.
9. **Tests:** Playwright-e2e voor registratie, publiceren, boeken en annuleren; tests voor autorisatie van het dashboard en de admin-routes.
10. `npm audit` en React upgraden naar de laatste 19.1.x.

## Door de eigenaar in te vullen
Zie de secretstabel in `DEPLOY.md`. Daarnaast:
- Stripe Connect activeren en de webhooks aanmaken;
- Resend-domein verifiëren;
- GitHub-environment `production` met reviewers en de secret `DIRECT_URL`;
- de juridische bedrijfsgegevens invullen.
