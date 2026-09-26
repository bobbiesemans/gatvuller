import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { PLATFORM_FEE } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const body = await req.json();
  const { slotId, customerName, customerEmail, customerPhone } = body as {
    slotId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  };

  if (!slotId || !customerName || !customerEmail) {
    return NextResponse.json({ error: "Ontbrekende velden" }, { status: 400 });
  }

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { salon: true, booking: true },
  });

  if (!slot || slot.status !== "OPEN" || slot.startsAt <= new Date()) {
    return NextResponse.json({ error: "Slot niet beschikbaar" }, { status: 409 });
  }
  if (slot.booking) {
    return NextResponse.json({ error: "Slot al geboekt" }, { status: 409 });
  }

  const feeAmount = Math.round((slot.discountPrice * PLATFORM_FEE) / 100);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const booking = await prisma.booking.create({
    data: {
      slotId: slot.id,
      customerId: session.user.id,
      amount: slot.discountPrice,
      feeAmount,
      feePercent: PLATFORM_FEE,
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      status: "PENDING",
    },
  });

  if (!stripeConfigured()) {
    // Demo mode: mark paid immediately so MVP is demoable without Stripe keys
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: { status: "PAID", stripePaymentId: "demo_payment" },
      }),
      prisma.slot.update({
        where: { id: slot.id },
        data: { status: "BOOKED", spotsLeft: 0 },
      }),
    ]);
    return NextResponse.json({ demoPaid: true, bookingId: booking.id });
  }

  const stripe = getStripe()!;
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: slot.discountPrice,
          product_data: {
            name: `${slot.title} — ${slot.salon.name}`,
            description: `Last-minute bij ${slot.salon.name} (${slot.salon.city}). Incl. GatVuller fee ${PLATFORM_FEE}%.`,
          },
        },
      },
    ],
    metadata: {
      bookingId: booking.id,
      slotId: slot.id,
      feeAmount: String(feeAmount),
    },
    success_url: `${appUrl}/boeking/succes?bookingId=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/boeking/annuleren?bookingId=${booking.id}`,
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: { stripeSessionId: checkout.id },
  });

  return NextResponse.json({ url: checkout.url, bookingId: booking.id });
}
