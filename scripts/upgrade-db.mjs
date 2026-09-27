import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

/**
 * Production was created with `db push`, so it has tables but no migration history.
 * Fresh databases go through `migrate deploy`. An existing pre-v2 database only
 * receives the v2 upgrade, then both migrations are marked applied.
 */
const prisma = new PrismaClient();

function run(command) {
  execSync(command, { stdio: "inherit" });
}

try {
  const tables = await prisma.$queryRaw`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'User'`;
  if (tables.length === 0) {
    console.log("[upgrade-db] empty database, applying migrations");
    run("npx prisma migrate deploy");
    process.exit(0);
  }

  const upgraded = await prisma.$queryRaw`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'locale'`;
  if (upgraded.length === 0) {
    console.log("[upgrade-db] applying marketplace v2 on the existing database");
    run("npx prisma db execute --file prisma/migrations/20260927060000_marketplace_v2/migration.sql --schema prisma/schema.prisma");
  } else {
    console.log("[upgrade-db] schema already at v2");
  }

  const history = await prisma.$queryRaw`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = '_prisma_migrations'`;
  if (history.length === 0) {
    run("npx prisma migrate resolve --applied 0_init");
  }
  const applied = await prisma.$queryRaw`
    SELECT migration_name FROM "_prisma_migrations"`;
  const names = new Set(applied.map((row) => row.migration_name));
  if (!names.has("0_init")) run("npx prisma migrate resolve --applied 0_init");
  if (!names.has("20260927060000_marketplace_v2")) {
    run("npx prisma migrate resolve --applied 20260927060000_marketplace_v2");
  }
} finally {
  await prisma.$disconnect();
}
