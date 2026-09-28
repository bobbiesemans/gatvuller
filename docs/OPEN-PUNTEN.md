# Open punten GatVuller (stand 28-09-2026, na MVP-afwerking)

Branch `feat/mvp-afwerking`. Nog niet gemerged naar `main`. De live site op Vercel draait nog de vorige `main`.

## Klaar in deze branch
- UI in nl/fr/en via next-intl, cookie `NEXT_LOCALE`, middleware voor `?lang=`, taalkiezer, gelijke sleutels in de drie catalogi.
- Design: papier, inkt, baksteen, serif-koppen, gedeelde componenten, één boekingsformulier met sticky knop op mobiel.
- Klant: URL-filters, afstand alleen in de browser, statuspagina die pollt, boekingen komend/voorbij, favoriete zaken op het account, melding per zaak, “meld dit aanbod”.
- Dashboard: profiel met hergeocoderen, extra locatie, foto-upload (uit zonder Blob-token), sjablonen bewerken, no-show, annuleren met terugbetaling, KPI’s live apart van test/demo.
- Admin: meldingen, beoordelingen verbergen, e-mail-outbox in testmodus, configuratiecheck zonder waarden.
- Juridisch: voorwaarden, privacy, `/voor-zaken` met commissie.
- SEO: stad×categorie, JSON-LD, slotpagina’s noindex plus OG-beeld, sitemap zonder verborgen zaken. Referral via `?ref=` bestond al.
- React 19.1.9. Kwaliteitsrun: tsc, lint, 10 vitest-tests, build, Playwright.

## Nog door Bob, vóór productie
Niet mergen en niet deployen tot Bob dat zegt. Daarna:
1. PR-CI groen laten worden.
2. Vercel-secrets volgens `DEPLOY.md`.
3. GitHub-environment `production` met reviewers en `DIRECT_URL`.
4. Actions → Database migrations → production. Open op de live database: `20260928090000_salon_pending_status` en `20260928090100_trust_and_payments`.
5. Merge naar `main`.
6. Stripe-webhooks op `/api/webhooks/stripe`, plus een Connect-endpoint met `account.updated`.
7. Rooktest op productie, inclusief een kleine live betaling die daarna wordt terugbetaald.

`npm audit` meldt nog advisories die alleen met een major upgrade van Next of Prisma weggaan. Die upgrade is niet meegenomen.
