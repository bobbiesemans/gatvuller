import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifySlotAlerts } from "@/lib/alerts";
import { enforceRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { ApiError } from "@/lib/errors";
import { parseSlotInstant } from "@/lib/time";
import { requireOwnedSalon } from "@/lib/ownership";

const createSchema = z.object({
  salonId: z.string().min(1),
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).optional(),
  startsAt: z.string().min(10),
  endsAt: z.string().min(10),
  originalPrice: z.number().int().positive().max(100_000_00),
  discountPrice: z.number().int().positive().max(100_000_00),
  capacity: z.number().int().min(1).max(12).default(1),
});

const patchSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(400).optional(),
  originalPrice: z.number().int().positive().max(100_000_00).optional(),
  discountPrice: z.number().int().positive().max(100_000_00).optional(),
  capacity: z.number().int().min(1).max(12).optional(),
  action: z.enum(["pause", "resume"]).optional(),
});

async function actor() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SALON_OWNER" && session.user.role !== "ADMIN")) {
    return null;
  }
  return session.user;
}

export async function POST(req: Request) {
  const user = await actor();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  try {
    await enforceRateLimit(`slot:${user.id}`, 30, 60 * 60);
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json({ error: "Te veel publicaties. Probeer later opnieuw." }, { status: 429 });
    throw err;
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige data" }, { status: 400 });
  const data = parsed.data;
  if (data.discountPrice > data.originalPrice) {
    return NextResponse.json({ error: "Kortingsprijs mag niet hoger zijn dan de normale prijs" }, { status: 400 });
  }
  const startsAt = parseSlotInstant(data.startsAt);
  const endsAt = parseSlotInstant(data.endsAt);
  if (!startsAt || !endsAt || endsAt <= startsAt) {
    return NextResponse.json({ error: "Ongeldig tijdvenster" }, { status: 400 });
  }
  if (startsAt.getTime() < Date.now() - 5 * 60 * 1000) {
    return NextResponse.json({ error: "Het moment ligt in het verleden" }, { status: 400 });
  }
  if (endsAt.getTime() - startsAt.getTime() > 8 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Een slot duurt maximaal 8 uur" }, { status: 400 });
  }

  try {
    await requireOwnedSalon(user, data.salonId);
  } catch {
    return NextResponse.json({ error: "Salon niet gevonden" }, { status: 404 });
  }

  const slot = await prisma.slot.create({
    data: {
      salonId: data.salonId,
      title: data.title,
      description: data.description,
      startsAt,
      endsAt,
      originalPrice: data.originalPrice,
      discountPrice: data.discountPrice,
      capacity: data.capacity,
      spotsLeft: data.capacity,
      status: "OPEN",
    },
  });

  await audit(user.id, "slot_published", "slot", slot.id, { salonId: data.salonId });
  await notifySlotAlerts(slot.id).catch(() => undefined);
  return NextResponse.json({ slot });
}

export async function PATCH(req: Request) {
  const user = await actor();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige data" }, { status: 400 });
  const data = parsed.data;

  const slot = await prisma.slot.findUnique({ where: { id: data.id }, include: { salon: true, bookings: true } });
  if (!slot) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  if (user.role !== "ADMIN" && slot.salon.ownerId !== user.id) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  if (slot.status === "CANCELLED" || slot.status === "EXPIRED") {
    return NextResponse.json({ error: "Dit slot kan niet meer gewijzigd worden" }, { status: 409 });
  }

  const active = slot.bookings.filter((b) => b.status === "PAID" || b.status === "PENDING" || b.status === "NO_SHOW");
  const nextOriginal = data.originalPrice ?? slot.originalPrice;
  const nextDiscount = data.discountPrice ?? slot.discountPrice;
  if (nextDiscount > nextOriginal) {
    return NextResponse.json({ error: "Kortingsprijs mag niet hoger zijn dan de normale prijs" }, { status: 400 });
  }
  if (data.capacity != null && data.capacity !== slot.capacity && active.length > 0) {
    return NextResponse.json({ error: "Capaciteit wijzigen kan niet zolang er reserveringen zijn" }, { status: 409 });
  }
  if ((data.originalPrice != null || data.discountPrice != null) && active.length > 0) {
    return NextResponse.json({ error: "Prijs wijzigen kan niet zolang er reserveringen zijn" }, { status: 409 });
  }

  let status = slot.status;
  if (data.action === "pause") {
    if (status !== "OPEN") return NextResponse.json({ error: "Alleen een open slot kan gepauzeerd worden" }, { status: 409 });
    status = "PAUSED";
  }
  if (data.action === "resume") {
    if (slot.status !== "PAUSED") return NextResponse.json({ error: "Alleen een gepauzeerd slot kan hervat worden" }, { status: 409 });
    status = slot.spotsLeft > 0 && slot.startsAt > new Date() ? "OPEN" : slot.status;
  }

  const capacity = data.capacity ?? slot.capacity;
  const updated = await prisma.slot.update({
    where: { id: slot.id },
    data: {
      title: data.title ?? slot.title,
      description: data.description ?? slot.description,
      originalPrice: nextOriginal,
      discountPrice: nextDiscount,
      capacity,
      spotsLeft: data.capacity != null ? capacity : slot.spotsLeft,
      status,
    },
  });
  await audit(user.id, data.action === "pause" ? "slot_paused" : data.action === "resume" ? "slot_resumed" : "slot_updated", "slot", slot.id);
  return NextResponse.json({ slot: updated });
}

export async function DELETE(req: Request) {
  const user = await actor();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });

  const slot = await prisma.slot.findUnique({
    where: { id },
    include: { salon: true, bookings: { where: { status: { in: ["PAID", "PENDING", "NO_SHOW"] } } } },
  });
  if (!slot) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  if (user.role !== "ADMIN" && slot.salon.ownerId !== user.id) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  if (slot.bookings.length > 0) {
    return NextResponse.json({ error: "Er staan nog reserveringen op dit slot. Pauzeer het in plaats van verwijderen." }, { status: 409 });
  }
  await prisma.slot.update({ where: { id }, data: { status: "CANCELLED" } });
  await audit(user.id, "slot_cancelled", "slot", id);
  return NextResponse.json({ ok: true });
}
