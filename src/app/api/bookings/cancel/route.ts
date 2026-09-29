import { NextResponse } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { cancelBooking } from "@/lib/bookings";

const schema = z.object({ bookingId: z.string().min(1).max(40) });

export const POST = route(async (req) => {
  const user = await requireUser();
  await enforceRateLimit(`cancel:${user.id}`, 20, 60 * 60);
  const body = await parseBody(req, schema);
  const result = await cancelBooking(body.bookingId, user);
  return NextResponse.json({ ok: true, ...result });
});
