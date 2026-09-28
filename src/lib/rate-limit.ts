import { prisma } from "./prisma";
import { ApiError } from "./errors";

/**
 * Fixed-window counter in Postgres: works across serverless instances without extra infrastructure.
 * The table is only touched through this raw statement, so NOW() is used consistently for both sides.
 */
export async function hitRateLimit(key: string, limit: number, windowSeconds: number) {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."windowStart" < NOW() - (${windowSeconds}::int * INTERVAL '1 second') THEN 1
        ELSE "RateLimit"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "RateLimit"."windowStart" < NOW() - (${windowSeconds}::int * INTERVAL '1 second') THEN NOW()
        ELSE "RateLimit"."windowStart"
      END
    RETURNING "count"`;
  const count = Number(rows[0]?.count ?? 0);
  return { ok: count <= limit, count, remaining: Math.max(0, limit - count) };
}

/** Only local test runs may switch rate limiting off; a production build always enforces it. */
export function rateLimitsDisabled() {
  return process.env.RATE_LIMIT_DISABLED === "true" && process.env.NODE_ENV !== "production";
}

export async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  if (rateLimitsDisabled()) return;
  const res = await hitRateLimit(key, limit, windowSeconds);
  if (!res.ok) throw new ApiError(429, "rate_limited");
}

export async function purgeRateLimits(olderThanSeconds = 86400) {
  return prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "windowStart" < NOW() - (${olderThanSeconds}::int * INTERVAL '1 second')`;
}
