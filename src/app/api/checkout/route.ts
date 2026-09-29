import { NextResponse } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody, clientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { startCheckout } from "@/lib/bookings";

const schema = z.object({
  slotId: z.string().min(1).max(40),
  customerName: z.string().trim().min(2).max(80),
  customerEmail: z.string().trim().email().max(120),
  customerPhone: z.string().trim().max(30).optional().nullable(),
});

export const POST = route(async (req) => {
  const user = await requireUser();
  await enforceRateLimit(`book:${user.id}:${clientIp(req)}`, 8, 10 * 60);
  const body = await parseBody(req, schema);
  const result = await startCheckout({
    slotId: body.slotId,
    customer: { id: user.id, locale: user.locale },
    contact: { name: body.customerName, email: body.customerEmail, phone: body.customerPhone },
  });
  return NextResponse.json(result);
});
