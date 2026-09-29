import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 1) continue;
    const key = trimmed.slice(0, index);
    let value = trimmed.slice(index + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

// Integration tests create and delete their own rows. They never run against the development
// database when a test database is configured, and never against a database that is not local
// (or a CI service container), so a wrong .env can not put test data into production.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL;
}
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && process.env.ALLOW_REMOTE_TEST_DATABASE !== "1") {
  let host = "";
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    throw new Error("DATABASE_URL is not a valid URL; refusing to run the test suite.");
  }
  if (!["localhost", "127.0.0.1", "::1", "[::1]", "postgres"].includes(host)) {
    throw new Error(
      `Refusing to run integration tests against "${host}". Point TEST_DATABASE_URL at a local database, or set ALLOW_REMOTE_TEST_DATABASE=1 if you are sure.`
    );
  }
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
