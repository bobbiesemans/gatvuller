import { NextResponse } from "next/server";
import { z } from "zod";
import { route, parseBody, clientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ApiError } from "@/lib/errors";

const schema = z
  .object({
    salonId: z.string().min(1).max(40),
    slotId: z.string().min(1).max(40).optional(),
    reason: z.enum(["FAKE_OFFER", "WRONG_PRICE", "SALON_NO_SHOW", "INAPPROPRIATE", "OTHER"]),
    message: z.string().trim().max(500).optional(),
  })
  // "Something else" says nothing without a few words of explanation.
  .refine((v) => v.reason !== "OTHER" || (v.message?.length ?? 0) >= 5, { path: ["message"], message: "required" });

export const POST = route(async (req) => {
  await enforceRateLimit(`report:${clientIp(req)}`, 8, 60 * 60);
  const body = await parseBody(req, schema);
  const user = await getCurrentUser();
  if (user) await enforceRateLimit(`report-user:${user.id}`, 10, 60 * 60);
  const salon = await prisma.salon.findUnique({ where: { id: body.salonId }, select: { id: true } });
  if (!salon) throw new ApiError(404, "not_found");
  if (body.slotId) {
    const slot = await prisma.slot.findFirst({ where: { id: body.slotId, salonId: salon.id }, select: { id: true } });
    if (!slot) throw new ApiError(404, "not_found");
  }
  await prisma.report.create({
    data: {
      salonId: salon.id,
      slotId: body.slotId,
      reporterId: user?.id,
      reporterEmail: user?.email,
      reason: body.reason,
      message: body.message || null,
    },
  });
  return NextResponse.json({ ok: true });
});
