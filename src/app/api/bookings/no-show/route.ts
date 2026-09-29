import { NextResponse } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { markNoShow } from "@/lib/bookings";

const schema = z.object({ bookingId: z.string().min(1).max(40) });

export const POST = route(async (req) => {
  const user = await requireUser(["SALON_OWNER", "ADMIN"]);
  await enforceRateLimit(`salon-noshow:${user.id}`, 120, 60 * 60);
  const body = await parseBody(req, schema);
  const booking = await markNoShow(body.bookingId, user);
  return NextResponse.json({ ok: true, status: booking.status });
});
