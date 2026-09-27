import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifySlotAlerts } from "@/lib/alerts";

const schema = z.object({
  salonId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  originalPrice: z.number().int().positive(),
  discountPrice: z.number().int().positive(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SALON_OWNER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige data", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  if (data.discountPrice > data.originalPrice) {
    return NextResponse.json({ error: "Kortingsprijs mag niet hoger zijn dan origineel" }, { status: 400 });
  }

  const salon = await prisma.salon.findFirst({
    where: {
      id: data.salonId,
      ...(session.user.role === "ADMIN" ? {} : { ownerId: session.user.id }),
    },
  });
  if (!salon) return NextResponse.json({ error: "Salon niet gevonden" }, { status: 404 });

  const slot = await prisma.slot.create({
    data: {
      salonId: salon.id,
      title: data.title,
      description: data.description,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      originalPrice: data.originalPrice,
      discountPrice: data.discountPrice,
      status: "OPEN",
    },
  });

  await notifySlotAlerts(slot.id).catch((err) => console.error("[alerts]", err));
  return NextResponse.json({ slot });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SALON_OWNER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });

  const slot = await prisma.slot.findUnique({ where: { id }, include: { salon: true } });
  if (!slot) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  if (session.user.role !== "ADMIN" && slot.salon.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  if (slot.status === "BOOKED") {
    return NextResponse.json({ error: "Geboekt slot kan niet verwijderd" }, { status: 409 });
  }
  await prisma.slot.update({ where: { id }, data: { status: "CANCELLED" } });
  return NextResponse.json({ ok: true });
}
