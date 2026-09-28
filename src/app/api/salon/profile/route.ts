import { NextResponse } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireOwnedSalon } from "@/lib/ownership";
import { cityByName } from "@/lib/catalog";
import { geocodeAddress } from "@/lib/geocode";
import { ApiError } from "@/lib/errors";
import { audit } from "@/lib/audit";

const schema = z.object({
  salonId: z.string().min(1).max(40),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(800),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  website: z.string().trim().max(160).optional().or(z.literal("")),
  address: z.string().trim().min(5).max(160),
  postalCode: z.string().trim().max(12).optional().or(z.literal("")),
});

export const PATCH = route(async (req) => {
  const user = await requireUser(["SALON_OWNER", "ADMIN"]);
  const body = await parseBody(req, schema);
  const salon = await requireOwnedSalon(user, body.salonId);
  const addressChanged = body.address !== salon.address;
  let lat = salon.lat;
  let lng = salon.lng;
  let locationExact = salon.locationExact;
  let postalCode = body.postalCode || salon.postalCode;
  if (addressChanged) {
    const city = cityByName(salon.city);
    if (!city) throw new ApiError(400, "city_unknown");
    const point = await geocodeAddress(body.address, city);
    if (!point) throw new ApiError(422, "geocode_failed");
    lat = point.lat;
    lng = point.lng;
    locationExact = true;
    postalCode = point.postalCode || postalCode;
  }
  await prisma.salon.update({
    where: { id: salon.id },
    data: {
      name: body.name,
      description: body.description,
      phone: body.phone || null,
      website: body.website || null,
      address: body.address,
      postalCode: postalCode || null,
      lat,
      lng,
      locationExact,
    },
  });
  await audit(user.id, "salon_profile", "salon", salon.id, { addressChanged });
  return NextResponse.json({ ok: true });
});
