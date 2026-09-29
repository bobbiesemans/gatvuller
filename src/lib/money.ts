import { PLATFORM_FEE_PERCENT } from "./config";
import { intlLocale } from "./time";

/** Amounts are integer cents everywhere; this is the only place they become euros. */
export function formatEuro(cents: number, locale = "nl") {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatNumber(n: number, locale = "nl", fractionDigits = 0) {
  return new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}

export function discountPercent(original: number, discounted: number) {
  if (original <= 0) return 0;
  return Math.max(0, Math.round(((original - discounted) / original) * 100));
}

export function saveAmount(original: number, discounted: number) {
  return Math.max(0, original - discounted);
}

/** Platform commission on what the customer pays, rounded to the cent. The salon pays it; the customer never does. */
export function platformFee(amount: number, percent = PLATFORM_FEE_PERCENT) {
  return Math.round((amount * percent) / 100);
}

/** What the salon keeps from one booking. */
export function salonNet(amount: number, percent = PLATFORM_FEE_PERCENT) {
  return amount - platformFee(amount, percent);
}

/** Parses "29", "29,5" or "29.50" euros into cents; null for anything else. */
export function eurosToCents(input: string | number): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input * 100) : null;
  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}
