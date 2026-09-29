import { NextResponse } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";

const schema = z.object({
  salonId: z.string().min(1).max(40),
  on: z.boolean(),
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, schema);
  const salon = await prisma.salon.findFirst({ where: { id: body.salonId, status: "ACTIVE" }, select: { id: true } });
  if (!salon) throw new ApiError(404, "not_found");
  if (body.on) {
    await prisma.favoriteSalon.upsert({
      where: { userId_salonId: { userId: user.id, salonId: salon.id } },
      create: { userId: user.id, salonId: salon.id },
      update: {},
    });
  } else {
    await prisma.favoriteSalon.deleteMany({ where: { userId: user.id, salonId: salon.id } });
  }
  return NextResponse.json({ ok: true, on: body.on });
});
