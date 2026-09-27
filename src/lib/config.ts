function bool(value: string | undefined, fallback: boolean) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function appUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3010");
  return raw.replace(/\/$/, "");
}

/** Demo mode shows demo accounts and simulates payment when Stripe is not configured. */
export const DEMO_MODE = bool(process.env.NEXT_PUBLIC_DEMO_MODE, true);

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
