import { NextResponse } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireOwnedSalon } from "@/lib/ownership";
import { audit } from "@/lib/audit";

const schema = z.object({
  salonId: z.string().min(1),
  cancellationHours: z.number().int().min(1).max(72),
});

export const PUT = route(async (req) => {
  const user = await requireUser(["SALON_OWNER", "ADMIN"]);
  const body = await parseBody(req, schema);
  await requireOwnedSalon(user, body.salonId);
  await prisma.salon.update({ where: { id: body.salonId }, data: { cancellationHours: body.cancellationHours } });
  await audit(user.id, "cancellation_hours", "salon", body.salonId, { hours: body.cancellationHours });
  return NextResponse.json({ ok: true });
});
