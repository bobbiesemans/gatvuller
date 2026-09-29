import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import type { Category } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { geocodeAddress, approximateLocation } from "@/lib/geocode";
import { recordEvent } from "@/lib/analytics";
import { adminEmail, appUrl } from "@/lib/config";
import { sendEmail } from "@/lib/email/send";
import { adminNoticeEmail } from "@/lib/email/templates";
import { isLaunchedCategory } from "@/lib/catalog";
import { cityByName } from "@/lib/catalog";
import { enforceRateLimit } from "@/lib/rate-limit";
import { randomCode } from "@/lib/codes";
import { isCategory } from "@/lib/catalog";
import { isDemoAccount, isDemoMode } from "@/lib/config";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(80),
  referralCode: z.string().trim().max(16).optional(),
  terms: z.literal(true),
  role: z.enum(["CUSTOMER", "SALON_OWNER"]).default("CUSTOMER"),
  salonName: z.string().trim().min(2).max(80).optional(),
  city: z.string().trim().max(40).optional(),
  category: z.string().max(20).optional(),
  address: z.string().trim().min(5).max(160).optional(),
  businessNumber: z.string().trim().max(20).optional(),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  try {
    await enforceRateLimit(`register:${ip}`, 5, 60 * 60);
  } catch {
    return NextResponse.json({ error: "Te veel pogingen. Probeer later opnieuw." }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige data" }, { status: 400 });
  }
  const data = parsed.data;
  const email = data.email.toLowerCase();
  if (!isDemoMode() && isDemoAccount(email)) {
    return NextResponse.json({ error: "Dit e-mailadres is niet beschikbaar" }, { status: 400 });
  }
  const exists = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (exists) return NextResponse.json({ error: "E-mail al in gebruik" }, { status: 409 });
  let salonCategory: Category | undefined;
  if (data.role === "SALON_OWNER") {
    const launchedCity = cityByName(data.city);
    if (!data.salonName || !launchedCity?.launched || !data.address || !isCategory(data.category) || !isLaunchedCategory(data.category)) {
      return NextResponse.json({ error: "Vul zaak, stad, categorie en adres in" }, { status: 400 });
    }
    salonCategory = data.category;
  }

  const passwordHash = await hash(data.password, 10);
  const referrer = data.referralCode
    ? await prisma.user.findUnique({ where: { referralCode: data.referralCode.toUpperCase() }, select: { id: true } })
    : null;
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email,
      passwordHash,
      role: data.role,
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
        city: data.city,
        country: cityByName(data.city)?.country || "BE",
        category: salonCategory,
        description: `${data.salonName} publiceert last-minute uren op GatVuller.`,
        address: data.address,
        lat: point.lat,
        lng: point.lng,
        postalCode: exact?.postalCode ?? null,
        locationExact: Boolean(exact),
        businessNumber: data.businessNumber || null,
        status: "PENDING",
      },
    });
    await audit(user.id, "salon_registered", "salon", salon.id, { city: data.city, category: salonCategory });
    await recordEvent("salon_registered", { entityType: "salon", entityId: salon.id });
    await sendEmail({
      to: adminEmail(),
      template: "admin_new_salon",
      ...adminNoticeEmail(`Nieuwe zaak: ${salon.name}`, [`${salon.name} in ${salon.city} wacht op controle.`, `Ondernemingsnummer: ${salon.businessNumber || "niet opgegeven"}`], `${appUrl()}/admin`),
    });
  }

  if (!salonCategory) await recordEvent("customer_registered");
  return NextResponse.json({ ok: true, role: user.role });
}
