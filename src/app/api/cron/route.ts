import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { expireEndedSlots, expireStaleHolds } from "@/lib/bookings";
import { sendReviewRequest } from "@/lib/email/notify";
import { purgeRateLimits } from "@/lib/rate-limit";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  return Boolean(secret) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** Maintenance. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Every step is idempotent. */
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const now = Date.now();
  const expiredHolds = await expireStaleHolds();
  const endedSlots = await expireEndedSlots();

  const due = await prisma.booking.findMany({
    where: {
      status: "PAID",
      reviewRequestedAt: null,
      review: null,
      slot: { endsAt: { lt: new Date(now - 2 * 3_600_000), gt: new Date(now - 7 * 86_400_000) } },
    },
    select: { id: true },
    take: 50,
  });
  for (const booking of due) {
    // Mark first so a crash never sends the same mail twice.
    await prisma.booking.update({ where: { id: booking.id }, data: { reviewRequestedAt: new Date() } });
    await sendReviewRequest(booking.id);
  }

  // Data minimisation.
  const [rateLimits, emails, tokens, events] = await Promise.all([
    purgeRateLimits(),
    prisma.emailLog.deleteMany({ where: { createdAt: { lt: new Date(now - 90 * 86_400_000) } } }),
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date(now - 86_400_000) } } }),
    prisma.stripeEvent.deleteMany({ where: { processedAt: { lt: new Date(now - 90 * 86_400_000) } } }),
  ]);
  const summary = { expiredHolds, endedSlots, reviewRequests: due.length, purged: { rateLimits, emails: emails.count, tokens: tokens.count, events: events.count } };
  log.info("cron.done", summary);
  return NextResponse.json(summary);
}
