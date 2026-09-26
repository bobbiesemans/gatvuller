# GatVuller

**Too Good To Go voor afspraken — niet voor eten.**

Last-minute marketplace voor lokale diensten in **België & Nederland**.
Salons posten Surprise slots (vanavond/morgen) met korting → klanten ontdekken op **kaart + lijst** → boeken & betalen → bevestiging met QR, adres en pin.

## Product UX (TGTG-mental model)

- Kaart + lijst toggle (Leaflet / OSM)
- Surprise cards: kortingsbadge, tijdvenster, afstand, countdown, favorieten
- "Bij mij in de buurt" (geolocatie)
- Marker clustering bij veel slots
- How it works (ontdek → reserveer → ga)
- Salon post in <30s (presets + origineel/Surprise prijs)
- Boekingsbevestiging met QR/code, kaartpin, annuleringsregels
- Demo book zonder Stripe

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind 4
- Auth.js (NextAuth v5) — credentials
- Prisma + Postgres
- Leaflet + react-leaflet (OSM tiles)
- Stripe Checkout (demo-fallback zonder keys)
- Deploy: Vercel (`prj_S3ikJoawd56TAyHXX8AsjwBfz5dW`)

## Lokaal

```bash
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev
```

### Demo accounts

| Rol   | E-mail              | Wachtwoord |
|-------|---------------------|------------|
| Salon | salon@gatvuller.be  | demo1234   |
| Klant | klant@gatvuller.be  | demo1234   |
| Admin | admin@gatvuller.be  | demo1234   |

Seed: 20 salons met geo-accurate coords in Antwerpen / Brussel / Gent / Amsterdam.
