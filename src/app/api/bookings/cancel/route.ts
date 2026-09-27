import { NextResponse } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody } from "@/lib/api";
import { cancelBooking } from "@/lib/bookings";

const schema = z.object({ bookingId: z.string().min(1) });

export const POST = route(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, schema);
  const reason = user.role === "ADMIN" ? "ADMIN" : user.role === "SALON_OWNER" ? "SALON" : "CUSTOMER";
  const result = await cancelBooking({
    bookingId: body.bookingId,
    actorId: user.id,
    actorRole: user.role,
    reason,
  });
  return NextResponse.json({ ok: true, refundAmount: result.refundAmount });
});
