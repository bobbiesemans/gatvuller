import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { getStripe, stripeWebhookSecrets } from "@/lib/stripe";
import { confirmCheckoutSession, releaseHoldBySession } from "@/lib/bookings";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/log";
import { refundStatusOf } from "@/lib/payments";

export const dynamic = "force-dynamic";

function verify(stripe: Stripe, payload: string, sig: string, secrets: string[]) {
  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(payload, sig, secret);
    } catch {
      /* try next secret */
    }
  }
  return null;
}

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await confirmCheckoutSession(event.data.object as Stripe.Checkout.Session);
      break;
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      await releaseHoldBySession((event.data.object as Stripe.Checkout.Session).id, event.type.split(".").pop()!);
      break;
    case "refund.updated":
    case "refund.created": {
      const refund = event.data.object as Stripe.Refund;
      await prisma.booking.updateMany({ where: { stripeRefundId: refund.id }, data: { refundStatus: refundStatusOf(refund.status) } });
      break;
    }
    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      const pi = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
      if (pi) await prisma.booking.updateMany({ where: { stripePaymentId: pi }, data: { disputedAt: new Date() } });
      break;
    }
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      await prisma.salon.updateMany({
        where: { stripeAccountId: account.id },
        data: {
          stripeChargesEnabled: account.capabilities?.transfers === "active",
          stripePayoutsEnabled: Boolean(account.payouts_enabled),
          stripeDetailsSubmitted: Boolean(account.details_submitted),
        },
      });
      break;
    }
  }
}

/** Signed, idempotent: an event id is processed once; a failure is retried by Stripe. */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secrets = stripeWebhookSecrets();
  if (!stripe || secrets.length === 0) return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  const event = verify(stripe, await req.text(), sig, secrets);
  if (!event) return NextResponse.json({ error: "bad_signature" }, { status: 400 });

  const seen = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
  if (seen) return NextResponse.json({ received: true, duplicate: true });
  try {
    await handle(event);
  } catch (error) {
    log.error("webhook.failed", { eventId: event.id, type: event.type, error });
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type, livemode: event.livemode } });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }
  return NextResponse.json({ received: true });
}
