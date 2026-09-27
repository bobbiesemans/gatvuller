import { NextResponse } from "next/server";
import { z } from "zod";
import { route, parseBody, clientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/session";

const NAMES = [
  "offer_viewed",
  "filter_used",
  "booking_started",
  "payment_started",
  "payment_completed",
  "salon_registered",
  "slot_published",
] as const;

const schema = z.object({
  name: z.enum(NAMES),
  entityId: z.string().max(80).optional(),
});

export const POST = route(async (req) => {
  await enforceRateLimit(`event:${clientIp(req)}`, 60, 60);
  const body = await parseBody(req, schema);
  const user = await getCurrentUser();
  await audit(user?.id ?? null, body.name, "analytics", body.entityId || "none");
  return NextResponse.json({ ok: true });
});
