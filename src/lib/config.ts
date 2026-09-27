function bool(value: string | undefined, fallback: boolean) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function appUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3010");
  return raw.replace(/\/$/, "");
}

/**
 * Test mode is explicit. It is on for local development unless turned off.
 * Production stays off unless NEXT_PUBLIC_DEMO_MODE=true. A booking is never
 * marked paid in production without a Stripe confirmation.
 */
export function isDemoMode() {
  const flag = process.env.NEXT_PUBLIC_DEMO_MODE;
  if (flag != null && flag !== "") return bool(flag, false);
  return process.env.NODE_ENV !== "production";
}

export const DEMO_MODE = isDemoMode();

/** Seed accounts. They can sign in only while test mode is on. */
export function isDemoAccount(email: string) {
  return /^(admin|klant|salon\d*)@gatvuller\.be$/i.test(email.trim());
}

export const PLATFORM_FEE_PERCENT = (() => {
  const n = Number(process.env.PLATFORM_FEE_PERCENT || "18");
  return Number.isFinite(n) && n >= 0 && n <= 50 ? Math.round(n) : 18;
})();

/** Minutes a spot stays reserved while the customer completes Stripe Checkout (Stripe minimum is 30). */
export const PAYMENT_HOLD_MINUTES = 35;

export const COMPANY = {
  brand: "GatVuller",
  legalName: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || "GatVuller",
  vatNumber: process.env.NEXT_PUBLIC_COMPANY_VAT || "",
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "Antwerpen, België",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hallo@gatvuller.be",
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "privacy@gatvuller.be",
};
