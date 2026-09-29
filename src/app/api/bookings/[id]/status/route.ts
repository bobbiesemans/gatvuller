import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { verifyBookingToken } from "@/lib/tokens";
import { retrieveCheckoutSession } from "@/lib/payments";
import { confirmCheckoutSession } from "@/lib/bookings";
import { ApiError } from "@/lib/errors";
import { getCurrentUser } from "@/lib/session";
import { hitRateLimit } from "@/lib/rate-limit";

export const GET = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const token = new URL(req.url).searchParams.get("t");
  const user = await getCurrentUser();
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { id: true, status: true, stripeSessionId: true, customerId: true },
  });
  if (!booking) throw new ApiError(404, "not_found");
  const allowed = (user && user.id === booking.customerId) || verifyBookingToken(booking.id, token);
  if (!allowed) throw new ApiError(404, "not_found");

  // Ask Stripe at most once every ten seconds per booking, however many tabs are polling.
  if (booking.status === "PENDING" && booking.stripeSessionId && (await hitRateLimit(`status:${booking.id}`, 1, 10)).ok) {
    const session = await retrieveCheckoutSession(booking.stripeSessionId);
    if (session?.status === "complete" && session.payment_status === "paid") {
      await confirmCheckoutSession(session);
      const fresh = await prisma.booking.findUnique({ where: { id }, select: { status: true } });
      return NextResponse.json({ status: fresh?.status ?? booking.status });
    }
  }
  return NextResponse.json({ status: booking.status });
});
