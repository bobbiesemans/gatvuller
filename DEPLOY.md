# GatVuller deploy notes

## Local demo
```bash
cd /workspace/gatvuller
npm install
npx prisma generate
# DATABASE_URL already in .env (Prisma Postgres)
npm run build && npx next start -p 3010
```
Demo users: `salon@` / `klant@` / `admin@gatvuller.be` · password `demo1234`

## Vercel (project `prj_S3ikJoawd56TAyHXX8AsjwBfz5dW`)
- `vercel.json` build: `prisma generate && node scripts/upgrade-db.mjs && next build`
- The upgrade script is a no-op once the database is on schema v2. On the original `db push` database it applies `20260927060000_marketplace_v2` and baselines Prisma's migration history. It does not run `db push`.
- Free tier hit `api-deployments-free-per-day` (100/day). Reset ~2026-09-28 02:13 CEST.
- After reset: deploy latest `main` once. Build previously failed on JSX `<30` / `<30s` — fixed.
- Optional: Vercel Pro (recurring) needs **explicit user approval** via `get_purchase_quote` → `buy_pro`.

## Production URLs
- https://gatvuller-validee-s-projects.vercel.app
- https://gatvuller.vercel.app
