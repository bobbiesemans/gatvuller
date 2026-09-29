import type { PaymentMode, Prisma, Salon, Slot } from "@prisma/client";
import { isDemoMode, MIN_LEAD_MINUTES } from "./config";
import { paymentsProvider, stripeMode } from "./stripe";
import { LAUNCHED_CATEGORIES, LAUNCHED_CITIES } from "./catalog";

/** Public listings follow the catalog: only launched cities and categories (flip `launched` to expand). */
const NICHE = {
  category: { in: LAUNCHED_CATEGORIES.map((c) => c.key) },
  city: { in: LAUNCHED_CITIES.map((c) => c.name) },
} satisfies Prisma.SalonWhereInput;

type BookableFields = Pick<Salon, "status" | "isDemo" | "stripeAccountId" | "stripeChargesEnabled">;

export type SlotVisibility =
  | "visible"
  | "paused"
  | "full"
  | "closing"
  | "ended"
  | "salon_pending"
  | "salon_suspended"
  | "payouts_missing"
  | "payments_off"
  | "demo_hidden";

/** What the owner needs to know: is this offer on the public site, and if not, why not. */
export function slotVisibility(
  slot: Pick<Slot, "status" | "spotsLeft" | "startsAt" | "endsAt">,
  salon: BookableFields,
  now = new Date()
): SlotVisibility {
  if (salon.status === "PENDING") return "salon_pending";
  if (salon.status === "SUSPENDED") return "salon_suspended";
  if (salon.isDemo && !isDemoMode()) return "demo_hidden";
  if (!salon.isDemo) {
    const provider = paymentsProvider();
    if (provider === "none") return "payments_off";
    if (provider === "stripe" && !(salon.stripeAccountId && salon.stripeChargesEnabled)) return "payouts_missing";
  }
  if (slot.status === "CANCELLED" || slot.status === "EXPIRED" || slot.endsAt <= now) return "ended";
  if (slot.status === "PAUSED") return "paused";
  if (slot.startsAt < bookingLeadCutoff(now)) return "closing";
  if (slot.status === "BOOKED" || slot.spotsLeft <= 0) return "full";
  return "visible";
}

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
    ...NICHE,
    OR: isDemoMode() ? [{ isDemo: true }, real] : [real],
  };
}

/** Salon pages stay reachable while bookings are not possible yet (for example before Stripe onboarding), but never for demo data in production or unapproved salons. */
export function visibleSalonWhere(): Prisma.SalonWhereInput {
  return { status: "ACTIVE", ...NICHE, ...(isDemoMode() ? {} : { isDemo: false }) };
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
