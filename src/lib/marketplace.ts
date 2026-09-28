import type { PaymentMode, Prisma, Salon } from "@prisma/client";
import { isDemoMode, MIN_LEAD_MINUTES } from "./config";
import { paymentsProvider, stripeMode } from "./stripe";

type BookableFields = Pick<Salon, "status" | "isDemo" | "stripeAccountId" | "stripeChargesEnabled">;

/**
 * A salon is public and bookable when an admin approved it and money can reach it:
 * - demo salons only while test mode is on (payment simulated);
 * - with Stripe: only once the connected account can receive transfers;
 * - without Stripe in test mode: simulated;
 * - without Stripe in production: nothing, because nothing can be paid.
 */
export function isSalonBookable(salon: BookableFields) {
  if (salon.status !== "ACTIVE") return false;
  if (salon.isDemo) return isDemoMode();
  const provider = paymentsProvider();
  if (provider === "stripe") return Boolean(salon.stripeAccountId && salon.stripeChargesEnabled);
  return provider === "simulated";
}

export function bookableSalonWhere(): Prisma.SalonWhereInput {
  const provider = paymentsProvider();
  const real: Prisma.SalonWhereInput =
    provider === "stripe"
      ? { isDemo: false, stripeChargesEnabled: true, stripeAccountId: { not: null } }
      : provider === "simulated"
        ? { isDemo: false }
        : { id: "__no_payments__" };
  return {
    status: "ACTIVE",
    OR: isDemoMode() ? [{ isDemo: true }, real] : [real],
  };
}

/** Salon pages stay reachable while bookings are not possible yet (for example before Stripe onboarding), but never for demo data in production or unapproved salons. */
export function visibleSalonWhere(): Prisma.SalonWhereInput {
  return { status: "ACTIVE", ...(isDemoMode() ? {} : { isDemo: false }) };
}

export function bookingLeadCutoff(now = new Date()) {
  return new Date(now.getTime() + MIN_LEAD_MINUTES * 60 * 1000);
}

/** Offers a customer can book right now. */
export function publicSlotWhere(now = new Date(), extra: Prisma.SlotWhereInput = {}): Prisma.SlotWhereInput {
  return {
    status: "OPEN",
    spotsLeft: { gt: 0 },
    startsAt: { gte: bookingLeadCutoff(now) },
    salon: bookableSalonWhere(),
    ...extra,
  };
}

export function paymentModeFor(salon: Pick<Salon, "isDemo">): PaymentMode {
  if (salon.isDemo || paymentsProvider() !== "stripe") return "DEMO";
  return stripeMode() === "live" ? "LIVE" : "TEST";
}

/** What the environment banner says. `live` shows nothing. */
export function environmentMode(): "demo" | "stripe_test" | "live" | "unconfigured" {
  const provider = paymentsProvider();
  if (provider === "none") return "unconfigured";
  if (isDemoMode()) return "demo";
  return stripeMode() === "live" ? "live" : "stripe_test";
}
