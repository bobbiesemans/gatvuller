import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { route, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireOwnedSalon } from "@/lib/ownership";
import { ApiError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";

/** The file type comes from the first bytes, not from the name or the browser's claim. */
function sniffImage(b: Uint8Array): { type: string; ext: string } | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: "image/jpeg", ext: "jpg" };
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { type: "image/png", ext: "png" };
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b.length > 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { type: "image/webp", ext: "webp" };
  return null;
}

export const POST = route(async (req) => {
  // Who is asking comes first: an anonymous caller learns nothing about the configuration.
  const user = await requireUser(["SALON_OWNER", "ADMIN"]);
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new ApiError(503, "uploads_disabled");
  await enforceRateLimit(`photo:${user.id}`, 30, 60 * 60);
  const form = await req.formData();
  const salonId = String(form.get("salonId") || "");
  const file = form.get("file");
  if (!salonId || !(file instanceof File)) throw new ApiError(400, "invalid_input");
  if (file.size > 4_000_000) throw new ApiError(400, "invalid_file");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) throw new ApiError(400, "invalid_file");
  const salon = await requireOwnedSalon(user, salonId);
  const count = await prisma.salonPhoto.count({ where: { salonId: salon.id } });
  if (count >= 8) throw new ApiError(400, "too_many_photos");
  const blob = await put(`salons/${salon.id}/${crypto.randomUUID()}.${kind.ext}`, Buffer.from(bytes), {
    access: "public",
    contentType: kind.type,
    addRandomSuffix: false,
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
