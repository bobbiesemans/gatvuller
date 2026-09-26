# GatVuller

Last-minute marketplace voor lokale diensten in **België & Nederland**.
Salons posten lege gaten (vanavond/morgen) met korting → klanten boeken & betalen online → platform neemt **18% fee**.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Auth.js (NextAuth v5) — credentials
- Prisma + Postgres (Prisma Postgres / Neon)
- Stripe Checkout (met demo-fallback zonder keys)
- Deploy: Vercel

## Lokaal runnen

```bash
cd /workspace/gatvuller
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000

### Demo accounts (na seed)

| Rol   | E-mail              | Wachtwoord |
|-------|---------------------|------------|
| Salon | salon@gatvuller.be  | demo1234   |
| Klant | klant@gatvuller.be  | demo1234   |
| Admin | admin@gatvuller.be  | demo1234   |

## Env vars

Zie `.env.example`. Zonder Stripe keys werkt boeken in demo-modus.

## Claim database

Tijdelijke Prisma Postgres claimen vóór expiry — of Neon URL plakken.

## Verdienmodel

1. Marketplace fee 18% op elke succesvolle last-minute boeking
2. Salons posten gratis lege slots
3. Klanten betalen online via Stripe
4. Focus vandaag/morgen only
5. Upsell later: featured, SMS, Connect payouts
