import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  bookingId: z.string().min(1),
});

/** Demo cancel: free until 2h before slot start. Restores OPEN slot. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Log in om te annuleren" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige data" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { slot: true },
  });
  if (!booking) return NextResponse.json({ error: "Boeking niet gevonden" }, { status: 404 });

  const isOwner =
    booking.customerId === session.user.id ||
    session.user.role === "ADMIN";
  if (!isOwner) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  if (booking.status === "CANCELLED" || booking.status === "REFUNDED") {
    return NextResponse.json({ error: "Al geannuleerd" }, { status: 409 });
  }

  const cutoff = booking.slot.startsAt.getTime() - 2 * 60 * 60 * 1000;
  if (Date.now() > cutoff && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Annuleren kan tot 2 uur voor start (demo-regel)." },
      { status: 409 }
    );
  }

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    }),
    prisma.slot.update({
      where: { id: booking.slotId },
      data: { status: "OPEN", spotsLeft: 1 },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
