import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import { route, requireUser, parseBody } from "@/lib/api";
import { checkIn } from "@/lib/bookings";
import { normalizeCode } from "@/lib/codes";

const schema = z.object({ code: z.string().min(4).max(16) });

export const POST = route(async (req) => {
  const user = await requireUser(["SALON_OWNER", "ADMIN"]);
  await enforceRateLimit(`salon-checkin:${user.id}`, 120, 60 * 60);
  const body = await parseBody(req, schema);
  const { booking, already } = await checkIn(normalizeCode(body.code), user);
  return NextResponse.json({ ok: true, already, bookingId: booking.id, customerName: booking.customerName, title: booking.slot.title });
});
