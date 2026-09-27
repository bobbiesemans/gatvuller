import { NextResponse } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody } from "@/lib/api";
import { checkIn } from "@/lib/bookings";
import { normalizeCode } from "@/lib/codes";

const schema = z.object({ code: z.string().min(4).max(16) });

export const POST = route(async (req) => {
  const user = await requireUser(["SALON_OWNER", "ADMIN"]);
  const body = await parseBody(req, schema);
  const booking = await checkIn(normalizeCode(body.code), user);
  return NextResponse.json({ ok: true, bookingId: booking.id, customerName: booking.customerName });
});
