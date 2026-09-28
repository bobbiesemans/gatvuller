function bool(value: string | undefined, fallback: boolean) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function appUrl() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && process.env.VERCEL_ENV === "production"
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3010");
  return raw.replace(/\/$/, "");
}

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

/**
 * Test mode is explicit. It is on for local development unless turned off, and off in a
 * production build unless NEXT_PUBLIC_DEMO_MODE=true. In test mode seed accounts can sign in,
 * demo salons are listed with a label and payments without Stripe are simulated. The UI shows a
 * banner whenever it is on. A booking is never marked paid in production without Stripe.
 */
export function isDemoMode() {
  // Live Stripe keys and test mode never run together: seed accounts must not meet real money.
  if ((process.env.STRIPE_SECRET_KEY || "").includes("_live_")) return false;
  const flag = process.env.NEXT_PUBLIC_DEMO_MODE;
  if (flag != null && flag !== "") return bool(flag, false);
  return process.env.NODE_ENV !== "production";
}

/** Seed accounts. They can sign in only while test mode is on. */
export function isDemoAccount(email: string) {
  return /^(admin|klant|salon\d*)@gatvuller\.be$/i.test(email.trim());
}

export const PLATFORM_FEE_PERCENT = (() => {
  const n = Number(process.env.PLATFORM_FEE_PERCENT || "18");
  return Number.isFinite(n) && n >= 0 && n <= 50 ? Math.round(n) : 18;
})();

/** Stripe Checkout sessions must live at least 30 minutes. */
export const CHECKOUT_SESSION_MINUTES = 31;

/** The spot stays reserved a little longer than the Checkout session, so a completed payment always finds it. */
export const PAYMENT_HOLD_MINUTES = 37;

/** A slot that starts sooner than this cannot be booked any more: nobody gets there in time. */
export const MIN_LEAD_MINUTES = 20;

/** How far ahead a salon can publish. GatVuller is for last-minute gaps, not for the agenda. */
export const MAX_PUBLISH_DAYS_AHEAD = 7;

export const SLOT_LIMITS = {
  minDurationMin: 10,
  maxDurationMin: 8 * 60,
  minPrice: 500,
  maxPrice: 100_000,
  minDiscountPercent: 5,
  maxDiscountPercent: 80,
  maxCapacity: 10,
  maxOpenPerSalon: 40,
} as const;

/** Reviews can be written up to this many days after the visit. */
export const REVIEW_WINDOW_DAYS = 30;

export const COMPANY = {
  brand: "GatVuller",
  legalName: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || "GatVuller",
  vatNumber: process.env.NEXT_PUBLIC_COMPANY_VAT || "",
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "Antwerpen, België",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hallo@gatvuller.be",
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "privacy@gatvuller.be",
};

/** Where new-salon and abuse notifications go. */
export function adminEmail() {
  return process.env.ADMIN_NOTIFICATION_EMAIL || COMPANY.email;
}

export function mapTiles() {
  return {
    url: process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  };
}
