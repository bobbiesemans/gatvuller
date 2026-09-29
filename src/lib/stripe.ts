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

/**
 * Test seam: STRIPE_API_URL points the SDK at a local stand-in (scripts/qa/fake-stripe.mjs, or Stripe's
 * own stripe-mock). It is honoured only for test keys and a local address, so a live key can never be
 * redirected and a deployment cannot be talked into sending payments elsewhere.
 */
export function stripeApiOverride(key: string, url: string | undefined = process.env.STRIPE_API_URL) {
  if (!url || !key.startsWith("sk_test_")) return null;
  try {
    const parsed = new URL(url);
    if (!["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname)) return null;
    const https = parsed.protocol === "https:";
    return { host: parsed.hostname, port: Number(parsed.port) || (https ? 443 : 80), protocol: https ? ("https" as const) : ("http" as const) };
  } catch {
    return null;
  }
}

export function getStripe() {
  const key = secretKey();
  if (!key) return null;
  if (!_stripe) {
    // POST retries get an automatic idempotency key from the SDK.
    _stripe = new Stripe(key, {
      maxNetworkRetries: 2,
      timeout: 20_000,
      appInfo: { name: "GatVuller" },
      ...(stripeApiOverride(key) ?? {}),
    });
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
