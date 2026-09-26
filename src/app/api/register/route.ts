import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { CITY_CENTERS } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["CUSTOMER", "SALON_OWNER"]).default("CUSTOMER"),
  salonName: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  address: z.string().optional(),
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
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige data" }, { status: 400 });
  }
  const data = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) return NextResponse.json({ error: "E-mail al in gebruik" }, { status: 409 });

  const passwordHash = await hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
    },
  });

  if (data.role === "SALON_OWNER" && data.salonName && data.city && data.category && data.address) {
    const base = slugify(data.salonName) || "salon";
    let slug = base;
    let i = 1;
    while (await prisma.salon.findUnique({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    const center = CITY_CENTERS[data.city] || CITY_CENTERS.ALL;
    // slight jitter so new salons don't stack on city center pin
    const jitter = () => (Math.random() - 0.5) * 0.02;
    await prisma.salon.create({
      data: {
        ownerId: user.id,
        name: data.salonName,
        slug,
        city: data.city,
        category: data.category as never,
        description: `${data.salonName} op GatVuller — Surprise slots welkom.`,
        address: data.address,
        lat: center.lat + jitter(),
        lng: center.lng + jitter(),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
