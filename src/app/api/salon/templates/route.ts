import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import { route, requireUser, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";

const schema = z.object({
  salonId: z.string().min(1),
  title: z.string().trim().min(2).max(80),
  durationMin: z.number().int().min(10).max(480),
  originalPrice: z.number().int().positive(),
  discountPrice: z.number().int().positive(),
});

export const POST = route(async (req) => {
  const user = await requireUser(["SALON_OWNER", "ADMIN"]);
  await enforceRateLimit(`salon-templates:${user.id}`, 60, 60 * 60);
  const body = await parseBody(req, schema);
  if (body.discountPrice > body.originalPrice) throw new ApiError(400, "price_invalid");
  const salon = await prisma.salon.findFirst({
    where: { id: body.salonId, ...(user.role === "ADMIN" ? {} : { ownerId: user.id }) },
  });
  if (!salon) throw new ApiError(404, "not_found");
  const template = await prisma.serviceTemplate.create({ data: body });
  return NextResponse.json({ template });
});

const patchSchema = schema.extend({ id: z.string().min(1).max(40) });

export const PATCH = route(async (req) => {
  const user = await requireUser(["SALON_OWNER", "ADMIN"]);
  await enforceRateLimit(`salon-templates:${user.id}`, 60, 60 * 60);
  const body = await parseBody(req, patchSchema);
  if (body.discountPrice > body.originalPrice) throw new ApiError(400, "price_invalid");
  const template = await prisma.serviceTemplate.findUnique({ where: { id: body.id }, include: { salon: true } });
  if (!template || !template.active) throw new ApiError(404, "not_found");
  if (user.role !== "ADMIN" && template.salon.ownerId !== user.id) throw new ApiError(403, "forbidden");
  if (template.salonId !== body.salonId) throw new ApiError(404, "not_found");
  const updated = await prisma.serviceTemplate.update({
    where: { id: body.id },
    data: {
      title: body.title,
      durationMin: body.durationMin,
      originalPrice: body.originalPrice,
      discountPrice: body.discountPrice,
    },
  });
  return NextResponse.json({ template: updated });
});

export const DELETE = route(async (req) => {
  const user = await requireUser(["SALON_OWNER", "ADMIN"]);
  await enforceRateLimit(`salon-templates:${user.id}`, 60, 60 * 60);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw new ApiError(400, "invalid_input");
  const template = await prisma.serviceTemplate.findUnique({ where: { id }, include: { salon: true } });
  if (!template) throw new ApiError(404, "not_found");
  if (user.role !== "ADMIN" && template.salon.ownerId !== user.id) throw new ApiError(403, "forbidden");
  await prisma.serviceTemplate.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
});
