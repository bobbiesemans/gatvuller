import { NextResponse } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { cityByName, isCategory, isLaunchedCategory } from "@/lib/catalog";
import { geocodeAddress, approximateLocation } from "@/lib/geocode";
import { slugify } from "@/lib/utils";
import { ApiError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { adminEmail, appUrl } from "@/lib/config";
import { sendEmail } from "@/lib/email/send";
import { adminNoticeEmail } from "@/lib/email/templates";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(40),
  category: z.string().max(20),
  address: z.string().trim().min(5).max(160),
  businessNumber: z.string().trim().max(20).optional(),
});

export const POST = route(async (req) => {
  const user = await requireUser(["SALON_OWNER", "ADMIN"]);
  const body = await parseBody(req, schema);
  const city = cityByName(body.city);
  if (!city?.launched || !isCategory(body.category) || !isLaunchedCategory(body.category)) {
    throw new ApiError(400, "invalid_input");
  }
  const exact = await geocodeAddress(body.address, city);
  const point = exact ?? approximateLocation(city);
  const base = slugify(body.name) || "salon";
  let slug = base;
  let i = 1;
  while (await prisma.salon.findUnique({ where: { slug } })) slug = `${base}-${i++}`;
  const salon = await prisma.salon.create({
    data: {
      ownerId: user.id,
      name: body.name,
      slug,
      city: city.name,
      country: city.country,
      category: body.category,
      description: `${body.name} publiceert last-minute uren op GatVuller.`,
      address: body.address,
      lat: point.lat,
      lng: point.lng,
      postalCode: exact?.postalCode ?? null,
      locationExact: Boolean(exact),
      businessNumber: body.businessNumber || null,
      status: "PENDING",
    },
  });
  await audit(user.id, "salon_location", "salon", salon.id, { city: city.name });
  await sendEmail({
    to: adminEmail(),
    template: "admin_new_salon",
    ...adminNoticeEmail(`Extra locatie: ${salon.name}`, [`${salon.name} in ${salon.city} wacht op controle.`], `${appUrl()}/admin`),
  });
  return NextResponse.json({ ok: true, id: salon.id, status: salon.status });
});
