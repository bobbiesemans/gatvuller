import type { Booking, RefundStatus, Salon, Slot } from "@prisma/client";
import type Stripe from "stripe";
import { appUrl, CHECKOUT_SESSION_MINUTES } from "./config";
import { requireStripe, getStripe, stripeLocale } from "./stripe";
import { formatRange } from "./time";
import { bookingToken } from "./tokens";
import { log } from "./log";

/**
 * Destination charge: the customer pays the platform, Stripe transfers the amount minus the
 * commission (`application_fee_amount`) to the salon's connected account. Card data never
 * touches GatVuller.
 */
export async function createCheckoutSession({
  booking,
  slot,
  salon,
}: {
  booking: Booking;
  slot: Slot;
  salon: Salon;
}): Promise<Stripe.Checkout.Session> {
  const stripe = requireStripe();
  if (!salon.stripeAccountId) throw new Error("Salon has no connected account");
  const token = bookingToken(booking.id);
  const base = appUrl();
  return stripe.checkout.sessions.create({
    mode: "payment",
    locale: stripeLocale(booking.locale),
    customer_email: booking.customerEmail,
    client_reference_id: booking.id,
    expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_MINUTES * 60,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: booking.amount,
          product_data: {
            name: `${slot.title} · ${salon.name}`,
            description: formatRange(slot.startsAt, slot.endsAt, booking.locale),
          },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: booking.feeAmount,
      transfer_data: { destination: salon.stripeAccountId },
      description: `GatVuller ${booking.confirmationCode}`,
      metadata: { bookingId: booking.id, slotId: slot.id, salonId: salon.id },
    },
    metadata: { bookingId: booking.id, slotId: slot.id, salonId: salon.id },
    success_url: `${base}/boeking/status?b=${booking.id}&t=${token}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/boeking/status?b=${booking.id}&t=${token}&afgebroken=1`,
  });
}

export async function retrieveCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  if (!stripe) return null;
  try {
    return await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    log.warn("checkout.retrieve_failed", { sessionId, error });
    return null;
  }
}

/** Best effort: a closed session cannot be paid any more. */
export async function expireCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  if (!stripe) return;
  try {
    await stripe.checkout.sessions.expire(sessionId);
  } catch (error) {
    // Already expired or completed: nothing to do.
    log.info("checkout.expire_skipped", { sessionId, error });
  }
}

export function refundStatusOf(status: string | null | undefined): RefundStatus {
  if (status === "succeeded") return "SUCCEEDED";
  if (status === "failed" || status === "canceled") return "FAILED";
  return "PENDING";
}

/**
 * Full refund that also pulls the transfer back from the salon and returns the commission to it,
 * so every party ends where it started. The idempotency key is the payment itself: however often
 * this runs for one payment, Stripe creates one refund.
 */
export async function refundPayment(paymentIntentId: string, opts: { bookingId: string; reason: string }) {
  const stripe = requireStripe();
  try {
    return await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        reverse_transfer: true,
        refund_application_fee: true,
        metadata: { bookingId: opts.bookingId, reason: opts.reason.slice(0, 40) },
      },
      { idempotencyKey: `refund:${paymentIntentId}` }
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "charge_already_refunded") {
      const existing = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 1 });
      if (existing.data[0]) return existing.data[0];
    }
    throw error;
  }
}

/* ---------------------------------------------------------------- Connect */

export async function createConnectedAccount(salon: Salon, email: string) {
  const stripe = requireStripe();
  return stripe.accounts.create(
    {
      type: "express",
      country: salon.country === "NL" ? "NL" : "BE",
      email,
      // Sole traders and companies both occur; Stripe asks during onboarding.
      business_profile: {
        name: salon.name,
        mcc: "7230",
        product_description: "Last-minute beauty and personal care appointments booked via GatVuller",
        ...(salon.website ? { url: salon.website } : {}),
      },
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { salonId: salon.id },
    },
    { idempotencyKey: `connect-account:${salon.id}` }
  );
}

export async function onboardingLink(accountId: string, salonId: string) {
  const stripe = requireStripe();
  const base = appUrl();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}/dashboard/uitbetalingen?zaak=${salonId}&stripe=vernieuwen`,
    return_url: `${base}/dashboard/uitbetalingen?zaak=${salonId}&stripe=terug`,
    type: "account_onboarding",
  });
  return link.url;
}

export async function expressDashboardLink(accountId: string) {
  const stripe = requireStripe();
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}

export type ConnectState = {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsDue: string[];
  disabledReason: string | null;
};

/** `chargesEnabled` means money can reach the salon: the transfers capability is active. */
export function connectState(account: Stripe.Account): ConnectState {
  const transfers = account.capabilities?.transfers;
  return {
    chargesEnabled: transfers === "active",
    payoutsEnabled: Boolean(account.payouts_enabled),
    detailsSubmitted: Boolean(account.details_submitted),
    requirementsDue: [...(account.requirements?.currently_due ?? []), ...(account.requirements?.past_due ?? [])],
    disabledReason: account.requirements?.disabled_reason ?? null,
  };
}

export async function retrieveConnectState(accountId: string) {
  const stripe = requireStripe();
  const account = await stripe.accounts.retrieve(accountId);
  return connectState(account);
}

export type PayoutOverview = {
  available: number;
  pending: number;
  payouts: { id: string; amount: number; status: string; arrivalDate: Date }[];
};

export async function payoutOverview(accountId: string): Promise<PayoutOverview> {
  const stripe = requireStripe();
  const [balance, payouts] = await Promise.all([
    stripe.balance.retrieve({}, { stripeAccount: accountId }),
    stripe.payouts.list({ limit: 8 }, { stripeAccount: accountId }),
  ]);
  const sum = (rows: { amount: number; currency: string }[]) =>
    rows.filter((r) => r.currency === "eur").reduce((total, r) => total + r.amount, 0);
  return {
    available: sum(balance.available),
    pending: sum(balance.pending),
    payouts: payouts.data.map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      arrivalDate: new Date(p.arrival_date * 1000),
    })),
  };
}
