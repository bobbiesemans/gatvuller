import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";

const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("database hardening", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("has row level security on every table in the public schema", async () => {
    const rows = await prisma.$queryRaw<{ table: string }[]>`
      SELECT c.relname AS "table"
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
      ORDER BY c.relname`;
    expect(
      rows.map((r) => r.table),
      "A new table needs ALTER TABLE ... ENABLE ROW LEVEL SECURITY in its migration (see 20260929090000_enable_row_level_security)."
    ).toEqual([]);
  });
});
