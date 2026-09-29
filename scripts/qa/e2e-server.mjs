#!/usr/bin/env node
/**
 * Starts everything the end-to-end tests need, in one process so Playwright manages a single web server:
 *   1. a separate database (gatvuller_e2e), migrated and seeded from scratch,
 *   2. the local stand-in for Stripe, sending signed webhooks to the app,
 *   3. the app itself (next dev) with test keys that point at the stand-in.
 * Local development and CI only. Never point E2E_DATABASE_URL at a real database: the seed wipes it,
 * and it refuses anything that is not on localhost.
 */
import { spawn, spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { startFakeStripe } from "./fake-stripe.mjs";

const APP_PORT = Number(process.env.E2E_APP_PORT || 3011);
const STRIPE_PORT = Number(process.env.E2E_STRIPE_PORT || 12111);
const WEBHOOK_SECRET = "whsec_e2e_local_only";

function e2eDatabaseUrl() {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  const base = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!base) throw new Error("Set TEST_DATABASE_URL (or E2E_DATABASE_URL) to a local Postgres.");
  const url = new URL(base);
  url.pathname = "/gatvuller_e2e";
  url.search = "";
  return url.toString();
}

const databaseUrl = e2eDatabaseUrl();
const target = new URL(databaseUrl);
if (!["127.0.0.1", "localhost"].includes(target.hostname)) {
  throw new Error(`Refusing to reset "${target.hostname}": the end-to-end database must be on localhost.`);
}

async function ensureDatabase() {
  const maintenance = new URL(databaseUrl);
  maintenance.pathname = "/postgres";
  const admin = new PrismaClient({ datasources: { db: { url: maintenance.toString() } } });
  try {
    const name = target.pathname.slice(1);
    const rows = await admin.$queryRawUnsafe(`SELECT 1 FROM pg_database WHERE datname = '${name.replace(/'/g, "''")}'`);
    if (rows.length === 0) await admin.$executeRawUnsafe(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
  } finally {
    await admin.$disconnect();
  }
}

function run(label, command, args, env) {
  console.log(`[e2e] ${label}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, ...env } });
  if (result.status !== 0) throw new Error(`${label} failed (exit ${result.status})`);
}

const dbEnv = { DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl, NEXT_PUBLIC_DEMO_MODE: "true" };

await ensureDatabase();
run("migrate", "npx", ["prisma", "migrate", "deploy"], dbEnv);
run("seed", "npx", ["tsx", "prisma/seed.ts"], dbEnv);

const appUrl = `http://127.0.0.1:${APP_PORT}`;
const fake = await startFakeStripe({
  port: STRIPE_PORT,
  webhookUrl: `${appUrl}/api/webhooks/stripe`,
  webhookSecret: WEBHOOK_SECRET,
  webhookDelayMs: 500,
});
console.log(`[e2e] fake Stripe on ${fake.url}`);

const app = spawn("npx", ["next", "dev", "--turbopack", "-p", String(APP_PORT)], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    ...dbEnv,
    NEXT_DIST_DIR: process.env.NEXT_DIST_DIR || ".next-e2e",
    NEXT_PUBLIC_APP_URL: appUrl,
    AUTH_URL: appUrl,
    AUTH_SECRET: process.env.AUTH_SECRET || "e2e-only-secret-not-used-anywhere-else",
    STRIPE_SECRET_KEY: "sk_test_e2e_local_only",
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    STRIPE_API_URL: fake.url,
    RATE_LIMIT_DISABLED: "true",
    GEOCODING_DISABLED: "true",
    CRON_SECRET: "e2e-cron-secret",
  },
});

function shutdown() {
  fake.stop().finally(() => {
    if (process.platform === "win32" && app.pid) spawnSync("taskkill", ["/pid", String(app.pid), "/T", "/F"]);
    else app.kill("SIGTERM");
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
app.on("exit", (code) => process.exit(code ?? 0));
