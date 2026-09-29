import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import { route, requireUser, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireOwnedSalon } from "@/lib/ownership";

const day = z
  .object({
    weekday: z.number().int().min(0).max(6),
    openMin: z.number().int().min(0).max(24 * 60),
    closeMin: z.number().int().min(0).max(24 * 60),
    closed: z.boolean(),
  })
  .refine((d) => d.closed || d.closeMin > d.openMin, { message: "closing before opening" });
// One entry per weekday: seven distinct days, never the same day twice.
const schema = z.object({
  salonId: z.string().min(1).max(40),
  days: z.array(day).length(7).refine((days) => new Set(days.map((d) => d.weekday)).size === 7),
});

export const PUT = route(async (req) => {
  const user = await requireUser(["SALON_OWNER", "ADMIN"]);
  await enforceRateLimit(`salon-hours:${user.id}`, 60, 60 * 60);
  const body = await parseBody(req, schema);
  await requireOwnedSalon(user, body.salonId);
  await prisma.$transaction(
    body.days.map((d) =>
      prisma.openingHour.upsert({
        where: { salonId_weekday: { salonId: body.salonId, weekday: d.weekday } },
        create: { salonId: body.salonId, ...d },
        update: d,
      })
    )
  );
  return NextResponse.json({ ok: true });
});
