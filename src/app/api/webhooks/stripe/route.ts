import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe niet geconfigureerd" }, { status: 500 });

  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret || secret.includes("REPLACE_ME")) {
    return NextResponse.json({ error: "Webhook secret ontbreekt" }, { status: 400 });
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature: ${err instanceof Error ? err.message : "fail"}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    if (bookingId) {
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (booking && booking.status !== "PAID") {
        await prisma.$transaction([
          prisma.booking.update({
            where: { id: bookingId },
            data: {
              status: "PAID",
              stripePaymentId:
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : session.id,
            },
          }),
          prisma.slot.update({
            where: { id: booking.slotId },
            data: { status: "BOOKED" },
          }),
        ]);
      }
    }
  }

  return NextResponse.json({ received: true });
}
