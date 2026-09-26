import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("REPLACE_ME")) {
    return null;
  }
  if (!_stripe) {
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export function stripeConfigured() {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(key && !key.includes("REPLACE_ME"));
}
