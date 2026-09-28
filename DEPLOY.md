# GatVuller op Vercel zetten

## Principes
- Een Vercel-build voert **geen** databasewijzigingen meer uit (`buildCommand`: `prisma generate && next build`).
- Migraties draaien apart en gecontroleerd via de GitHub Action **Database migrations** (`.github/workflows/migrate.yml`). Die start je handmatig en ze vraagt goedkeuring via de GitHub-environment `production`.
- Volgorde bij elke release met een nieuwe migratie:
  1. Merge naar `main` pas nadat CI groen is.
  2. Start **Actions → Database migrations → production** en keur goed.
  3. Laat Vercel daarna (opnieuw) deployen.

  Migraties zijn additief geschreven, zodat de oude code tijdens die paar minuten blijft werken.

## Openstaande migraties voor de live database
- `20260928090000_salon_pending_status` (nieuwe enumwaarde PENDING)
- `20260928090100_trust_and_payments` (betaalmodus, refunds, meldingen, idempotente webhooks, analytics zonder persoonsgegevens, CHECK-constraints)

De backfill wist niets. Seedzaken worden gemarkeerd als demo en ratings worden herberekend uit echte reviews.

## Secrets (Vercel → Settings → Environment Variables; nooit in git)
| Naam | Productie | Opmerking |
| --- | --- | --- |
| `DATABASE_URL` | ja | pooled verbinding (Supabase: poort 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | ja | directe verbinding, ook als GitHub-secret voor de migratie-workflow |
| `AUTH_SECRET` | ja | `openssl rand -base64 48` |
| `AUTH_URL`, `NEXT_PUBLIC_APP_URL` | ja | publieke URL zonder slash op het eind |
| `NEXT_PUBLIC_DEMO_MODE` | `false` | nooit `true` op de live site |
| `STRIPE_SECRET_KEY` | ja | `sk_live_…` (of `sk_test_…` op preview) |
| `STRIPE_WEBHOOK_SECRET` | ja | endpoint voor platform-events |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | aanbevolen | endpoint "events on connected accounts" (`account.updated`) |
| `CRON_SECRET` | ja | Vercel stuurt dit automatisch mee naar `/api/cron` |
| `RESEND_API_KEY`, `EMAIL_FROM` | ja | zonder key wordt er in productie niets verstuurd (gelogd als FAILED) |
| `ADMIN_NOTIFICATION_EMAIL` | aanbevolen | meldingen over nieuwe zaken |
| `NEXT_PUBLIC_COMPANY_LEGAL_NAME`, `_VAT`, `_ADDRESS`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_PRIVACY_EMAIL` | ja | juridische gegevens op de voorwaarden, de privacypagina en in e-mails |
| `PLATFORM_FEE_PERCENT` | nee | standaard 18 |

## Stripe
1. Activeer Connect (Express) in het Stripe-dashboard. Land: BE/NL.
2. Maak de webhook `https://<domein>/api/webhooks/stripe` aan met deze events:
   - `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`
   - `refund.created`, `refund.updated`, `charge.dispute.created`
3. Maak een tweede endpoint op dezelfde URL voor **connected accounts** met `account.updated`.
4. Een boeking wordt alleen PAID na een bevestiging van Stripe: via de webhook, of doordat de server de sessie zelf ophaalt. Een redirect alleen telt nooit.

## Cron
`vercel.json` plant `/api/cron` dagelijks om 05:00 UTC (de limiet van Vercel Hobby). Betaalholds worden ook bij elke checkout en bij het bladeren vrijgegeven. Op Vercel Pro kan je de schedule naar `*/10 * * * *` zetten.

## Testmodus
- Lokaal is de testmodus aan. Seed-accounts werken alleen dan en de seed weigert elke niet-lokale database.
- `NEXT_PUBLIC_DEMO_MODE=false` + `NODE_ENV=production`: demo-accounts kunnen niet inloggen, demozaken zijn onzichtbaar en zonder Stripe kan je niet boeken.
- Met live Stripe-sleutels staat de testmodus altijd uit.

## Lokale controles
```bash
npx prisma migrate deploy
npx tsc --noEmit && npm run lint && npm test && npm run build
```
