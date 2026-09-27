import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function stripeConfigured() {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(key && key.startsWith("sk_") && !key.includes("REPLACE_ME"));
}

export function getStripe() {
  if (!stripeConfigured()) return null;
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return _stripe;
}

export function stripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  return secret && secret.startsWith("whsec_") && !secret.includes("REPLACE_ME") ? secret : null;
}

export function stripeLocale(locale: string): Stripe.Checkout.SessionCreateParams.Locale {
  return locale === "fr" ? "fr" : locale === "en" ? "en" : "nl";
}
