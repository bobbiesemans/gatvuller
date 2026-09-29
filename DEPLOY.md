# GatVuller op Vercel zetten

## Principes
- Een Vercel-build voert **geen** databasewijzigingen meer uit (`buildCommand`: `prisma generate && next build`).
- Migraties draaien apart en gecontroleerd via de GitHub Action **Database migrations** (`.github/workflows/migrate.yml`). Die start je handmatig en ze vraagt goedkeuring via de GitHub-environment `production`.
- Volgorde bij een release met een nieuwe migratie:
  1. Controleer eerst een databasebackup, de juiste `DIRECT_URL` en `DATABASE_URL`, de migratiegeschiedenis en een groene CI/preview. Controleer dat de bestaande productieversie compatibel blijft met de geplande migraties; behandel dit per migratie, niet als algemene aanname.
  2. Voer de migraties tegen de bedoelde database gecontroleerd uit via **Actions → Database migrations → production**. De workflow controleert `prisma migrate status` na `migrate deploy` en stopt bij een fout.
  3. Controleer de migratiestatus en de bestaande productie-health. Merge pas daarna de compatibele code naar `main`, en controleer de nieuwe productie-health en kernflows direct na deploy.
  4. Als een migratie niet achterwaarts compatibel is: maak eerst een afzonderlijke compatibiliteitsrelease. Merge de nieuwe code niet vooruitlopend op een ongeteste migratie.

  Een Vercel-preview van deze branch kan falen zolang de previewdatabase niet bereikbaar en gemigreerd is. Dat is geen reden om de fout te omzeilen.

## Openstaande migraties voor de live database
- `20260928090000_salon_pending_status` (nieuwe enumwaarde PENDING)
- `20260928090100_trust_and_payments` (betaalmodus, refunds, meldingen, idempotente webhooks, analytics zonder persoonsgegevens, CHECK-constraints)
- `20260929090000_enable_row_level_security` (RLS op publiek bereikbare tabellen; controleer database-eigenaar en eventuele externe Supabase-toegang)

Controleer de werkelijk toegepaste migraties met `prisma migrate status`; deze lijst is geen bewijs dat ze al live staan.

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
