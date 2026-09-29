import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hash } from "bcryptjs";
import type { Category } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, parseBody, clientIp, ApiError } from "@/lib/api";
import { geocodeAddress, approximateLocation } from "@/lib/geocode";
import { recordEvent } from "@/lib/analytics";
import { adminEmail, appUrl, isDemoAccount, isDemoMode } from "@/lib/config";
import { sendEmail } from "@/lib/email/send";
import { adminNoticeEmail } from "@/lib/email/templates";
import { cityByName, isCategory, isLaunchedCategory } from "@/lib/catalog";
import { enforceRateLimit } from "@/lib/rate-limit";
import { randomCode } from "@/lib/codes";
import { audit } from "@/lib/audit";
import { passwordSchema } from "@/lib/password-rules";
import { normalizeBusinessNumber } from "@/lib/business-number";
import { LOCALE_COOKIE, toLocale } from "@/i18n/config";
import { translator } from "@/lib/i18n/translator";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  password: passwordSchema,
  referralCode: z.string().trim().max(16).optional(),
  terms: z.literal(true),
  role: z.enum(["CUSTOMER", "SALON_OWNER"]).default("CUSTOMER"),
  salonName: z.string().trim().min(2).max(80).optional(),
  city: z.string().trim().max(40).optional(),
  category: z.string().max(20).optional(),
  address: z.string().trim().min(5).max(160).optional(),
  businessNumber: z.string().trim().max(30).optional(),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

/**
 * Creates an account. A business owner also creates a salon that stays PENDING until an admin approves it.
 * "Already registered" and "not allowed" share one code, and the password is hashed before the lookup so
 * neither the answer nor the timing tells a stranger whether an address has an account.
 */
export const POST = route(async (req) => {
  await enforceRateLimit(`register:${clientIp(req)}`, 5, 60 * 60);
  const data = await parseBody(req, schema);
  const email = data.email.toLowerCase();
  const locale = toLocale((await cookies()).get(LOCALE_COOKIE)?.value);

  const passwordHash = await hash(data.password, 10);
  if (!isDemoMode() && isDemoAccount(email)) throw new ApiError(409, "auth_register_failed");
  const exists = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
  if (exists) throw new ApiError(409, "auth_register_failed");

  let salonCategory: Category | undefined;
  let businessNumber: string | null = null;
  if (data.role === "SALON_OWNER") {
    const launchedCity = cityByName(data.city);
    if (!data.salonName || !launchedCity?.launched || !data.address || !isCategory(data.category) || !isLaunchedCategory(data.category)) {
      throw new ApiError(400, "auth_business_incomplete");
    }
    if (data.businessNumber) {
      businessNumber = normalizeBusinessNumber(data.businessNumber);
      if (!businessNumber) throw new ApiError(400, "auth_business_number_invalid");
    }
    salonCategory = data.category;
  }

  const referrer = data.referralCode
    ? await prisma.user.findUnique({ where: { referralCode: data.referralCode.toUpperCase() }, select: { id: true } })
    : null;
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email,
      passwordHash,
      role: data.role,
      locale,
      referralCode: randomCode(8),
      referredById: referrer?.id ?? null,
      termsAcceptedAt: new Date(),
    },
  });

  if (salonCategory && data.salonName && data.city && data.address) {
    const base = slugify(data.salonName) || "salon";
    let slug = base;
    let i = 1;
    while (await prisma.salon.findUnique({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    const city = cityByName(data.city)!;
    const exact = await geocodeAddress(data.address, city);
    const point = exact ?? approximateLocation(city);
    const salon = await prisma.salon.create({
      data: {
        ownerId: user.id,
        name: data.salonName,
        slug,
        city: city.name,
        country: city.country,
        category: salonCategory,
        description: translator(locale, "ui.auth")("defaultDescription", { name: data.salonName }),
        address: data.address,
        lat: point.lat,
        lng: point.lng,
        postalCode: exact?.postalCode ?? null,
        locationExact: Boolean(exact),
        businessNumber,
        status: "PENDING",
      },
    });
    await audit(user.id, "salon_registered", "salon", salon.id, { city: city.name, category: salonCategory });
    await recordEvent("salon_registered", { entityType: "salon", entityId: salon.id });
    // Internal notice for the GatVuller team, in English.
    await sendEmail({
      to: adminEmail(),
      template: "admin_new_salon",
      ...adminNoticeEmail(
        `New business: ${salon.name}`,
        [`${salon.name} in ${salon.city} is waiting for review.`, `Company number: ${salon.businessNumber || "not given"}`],
        `${appUrl()}/admin`
      ),
    });
  }

  if (!salonCategory) await recordEvent("customer_registered");
  return NextResponse.json({ ok: true, role: user.role });
});
