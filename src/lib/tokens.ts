import { createHmac, timingSafeEqual } from "crypto";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is required");
  return s || "gatvuller-dev-secret";
}

export function signValue(purpose: string, value: string) {
  return createHmac("sha256", secret()).update(`${purpose}:${value}`).digest("base64url").slice(0, 32);
}

export function verifySigned(purpose: string, value: string, signature: string | null | undefined) {
  if (!signature) return false;
  const expected = signValue(purpose, value);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Lets a voucher link from an e-mail open without logging in on that device. */
export const bookingToken = (bookingId: string) => signValue("booking", bookingId);
export const verifyBookingToken = (bookingId: string, token?: string | null) =>
  verifySigned("booking", bookingId, token);
