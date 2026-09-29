import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import { route, requireUser, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";

const day = z.object({
  weekday: z.number().int().min(0).max(6),
  openMin: z.number().int().min(0).max(24 * 60),
  closeMin: z.number().int().min(0).max(24 * 60),
  closed: z.boolean(),
});
const schema = z.object({ salonId: z.string().min(1), days: z.array(day).length(7) });

async function ownedSalon(userId: string, role: string, salonId: string) {
  const salon = await prisma.salon.findFirst({
    where: { id: salonId, ...(role === "ADMIN" ? {} : { ownerId: userId }) },
  });
  if (!salon) throw new ApiError(404, "not_found");
  return salon;
}

export const PUT = route(async (req) => {
  const user = await requireUser(["SALON_OWNER", "ADMIN"]);
  await enforceRateLimit(`salon-hours:${user.id}`, 60, 60 * 60);
  const body = await parseBody(req, schema);
  await ownedSalon(user.id, user.role, body.salonId);
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
