import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { route, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireOwnedSalon } from "@/lib/ownership";
import { ApiError } from "@/lib/errors";

const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const POST = route(async (req) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new ApiError(503, "uploads_disabled");
  const user = await requireUser(["SALON_OWNER", "ADMIN"]);
  const form = await req.formData();
  const salonId = String(form.get("salonId") || "");
  const file = form.get("file");
  if (!salonId || !(file instanceof File)) throw new ApiError(400, "invalid_input");
  if (!TYPES.has(file.type) || file.size > 4_000_000) throw new ApiError(400, "invalid_file");
  const salon = await requireOwnedSalon(user, salonId);
  const count = await prisma.salonPhoto.count({ where: { salonId: salon.id } });
  if (count >= 8) throw new ApiError(400, "too_many_photos");
  const safeName = file.name.replace(/[^a-zA-Z0-9.]+/g, "-").slice(0, 40);
  const blob = await put(`salons/${salon.id}/${crypto.randomUUID()}-${safeName}`, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  const photo = await prisma.salonPhoto.create({
    data: { salonId: salon.id, url: blob.url, storageKey: blob.pathname, alt: salon.name, sortOrder: count },
  });
  if (!salon.imageUrl) {
    await prisma.salon.update({ where: { id: salon.id }, data: { imageUrl: blob.url } });
  }
  return NextResponse.json({ ok: true, id: photo.id, url: photo.url });
});
