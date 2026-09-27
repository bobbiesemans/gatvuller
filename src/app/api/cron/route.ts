import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expireStaleHolds } from "@/lib/bookings";
import { sendReviewRequest } from "@/lib/email/notify";

export const dynamic = "force-dynamic";

/** Hourly maintenance. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const expired = await expireStaleHolds();
  const due = await prisma.booking.findMany({
    where: {
      status: "PAID",
      reviewRequestedAt: null,
      review: null,
      slot: { endsAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
    },
    select: { id: true },
    take: 30,
  });
  for (const booking of due) {
    await sendReviewRequest(booking.id);
    await prisma.booking.update({ where: { id: booking.id }, data: { reviewRequestedAt: new Date() } });
  }
  return NextResponse.json({ expired, reviewRequests: due.length });
}
