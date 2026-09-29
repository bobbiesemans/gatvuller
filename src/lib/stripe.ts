import Stripe from "stripe";
import { isDemoMode } from "./config";

let _stripe: Stripe | null = null;

function secretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("REPLACE_ME")) return null;
  return key.startsWith("sk_") || key.startsWith("rk_") ? key : null;
}

export function stripeConfigured() {
  return secretKey() !== null;
}

/** `test` for sk_test_/rk_test_ keys, `live` for live keys, `null` without Stripe. */
export function stripeMode(): "test" | "live" | null {
  const key = secretKey();
  if (!key) return null;
  return key.includes("_live_") ? "live" : "test";
}

export function getStripe() {
  const key = secretKey();
  if (!key) return null;
  if (!_stripe) {
    // POST retries get an automatic idempotency key from the SDK.
    _stripe = new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000, appInfo: { name: "GatVuller" } });
  }
  return _stripe;
}

export function requireStripe() {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  return stripe;
}

/** Signing secrets: one for platform events, optionally one for the Connect endpoint. */
export function stripeWebhookSecrets() {
  return [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(
    (s): s is string => Boolean(s && s.startsWith("whsec_") && !s.includes("REPLACE_ME"))
  );
}

export function stripeLocale(locale: string): Stripe.Checkout.SessionCreateParams.Locale {
  return locale === "fr" ? "fr" : locale === "en" ? "en" : "nl";
}

/**
 * How money moves in this environment:
 * - `stripe`: Stripe Checkout with Connect (test or live keys).
 * - `simulated`: test mode without Stripe keys. Nothing is charged and the UI says so.
 * - `none`: production without Stripe. Nothing can be booked.
 */
export type PaymentsProvider = "stripe" | "simulated" | "none";

export function paymentsProvider(): PaymentsProvider {
  if (stripeConfigured()) return "stripe";
  return isDemoMode() ? "simulated" : "none";
}
