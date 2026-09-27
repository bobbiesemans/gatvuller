# GatVuller op Vercel zetten

De productiedatabase is alleen bereikbaar vanuit Vercel. Daarom voert de deploy dit uit:

```bash
prisma migrate deploy && prisma generate && next build
```

`prisma migrate deploy` past alleen migraties toe die in git staan en nog niet in `_prisma_migrations` zitten. Als de database bij is, stopt het commando meteen. Er wordt niet geseed en het oude `scripts/upgrade-db.mjs` draait niet mee.

Al toegepast op de live database vóór deze ronde: `0_init` en `20260927060000_marketplace_v2`. Deze ronde voegt toe:

- `20260927150000_salon_ops` — openingstijden, behandelsjablonen, referralcode
- `20260927160000_slot_paused` — status `PAUSED`

Lokaal, met een eigen `DATABASE_URL`:

```bash
npx prisma migrate deploy
```

## Secrets

Zet deze in Vercel, niet in de repository.

| Naam | Verplicht in productie |
| --- | --- |
| `DATABASE_URL` | ja |
| `AUTH_SECRET` | ja, lange willekeurige waarde |
| `AUTH_URL` | ja, de publieke URL |
| `NEXT_PUBLIC_APP_URL` | ja, dezelfde URL, zonder slash op het eind |
| `NEXT_PUBLIC_DEMO_MODE` | `false` |
| `STRIPE_SECRET_KEY` | ja, `sk_live_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ja |
| `STRIPE_WEBHOOK_SECRET` | ja, `whsec_…` |
| `PLATFORM_FEE_PERCENT` | nee, standaard 18 |
| `CRON_SECRET` | ja, als je `/api/cron` plant |
| `RESEND_API_KEY` | nee, zonder key gaat mail naar de outbox |
| `EMAIL_FROM` | nee |
| `NEXT_PUBLIC_COMPANY_LEGAL_NAME` | nee, tot de juridische naam vastligt |
| `NEXT_PUBLIC_COMPANY_VAT` | nee |
| `NEXT_PUBLIC_COMPANY_ADDRESS` | nee |
| `NEXT_PUBLIC_CONTACT_EMAIL` | nee |
| `NEXT_PUBLIC_PRIVACY_EMAIL` | nee |

Stripe-webhook: `https://<domein>/api/webhooks/stripe` met `checkout.session.completed` en `checkout.session.expired`.

Cron, buiten de build: `GET /api/cron` met `Authorization: Bearer <CRON_SECRET>`. Die laat verlopen betaalreserveringen vrij.

## Testmodus en productie

- `NEXT_PUBLIC_DEMO_MODE=false` en `NODE_ENV=production`: een boeking wordt nooit `PAID` zonder Stripe. Ontbrekende Stripe-sleutels geven `payments_not_configured` en maken de reservering weer vrij.
- Demo-accounts `admin@`, `klant@` en `salon…@gatvuller.be` kunnen in die stand niet inloggen. De rijen blijven in de database staan.
- Zet `NEXT_PUBLIC_DEMO_MODE` niet op `true` op de live site.

## Lokale controles

```bash
npm install
npx prisma migrate deploy
npm test
npx tsc --noEmit
npm run lint
npm run build
```
