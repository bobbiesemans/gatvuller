import { MAX_PUBLISH_DAYS_AHEAD, MIN_LEAD_MINUTES, SLOT_LIMITS } from "./config";
import { discountPercent } from "./money";

export type SlotValues = {
  startsAt: Date;
  endsAt: Date;
  originalPrice: number;
  discountPrice: number;
  capacity: number;
};

export type SlotRuleError =
  | "invalid_time"
  | "too_soon"
  | "duration_out_of_range"
  | "too_far_ahead"
  | "price_out_of_range"
  | "discount_out_of_range"
  | "capacity_out_of_range";

/**
 * One set of rules for the publish form, the API and later edits, so a fake discount or an offer
 * nobody can book slips in through none of them. `timing: false` skips the lead-time and horizon
 * checks for an edit that leaves the time alone (a description change ten minutes before the start).
 */
export function checkSlotValues(v: SlotValues, now = new Date(), opts: { timing?: boolean } = {}): SlotRuleError | null {
  const timing = opts.timing ?? true;
  const start = v.startsAt.getTime();
  const end = v.endsAt.getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return "invalid_time";
  const minutes = (end - start) / 60_000;
  if (minutes < SLOT_LIMITS.minDurationMin || minutes > SLOT_LIMITS.maxDurationMin) return "duration_out_of_range";
  if (timing && start < now.getTime() + MIN_LEAD_MINUTES * 60_000) return "too_soon";
  if (timing && start > now.getTime() + MAX_PUBLISH_DAYS_AHEAD * 86_400_000) return "too_far_ahead";
  if (
    !Number.isInteger(v.originalPrice) ||
    !Number.isInteger(v.discountPrice) ||
    v.discountPrice < SLOT_LIMITS.minPrice ||
    v.originalPrice > SLOT_LIMITS.maxPrice
  ) {
    return "price_out_of_range";
  }
  const pct = discountPercent(v.originalPrice, v.discountPrice);
  if (v.discountPrice >= v.originalPrice || pct < SLOT_LIMITS.minDiscountPercent || pct > SLOT_LIMITS.maxDiscountPercent) {
    return "discount_out_of_range";
  }
  if (!Number.isInteger(v.capacity) || v.capacity < 1 || v.capacity > SLOT_LIMITS.maxCapacity) return "capacity_out_of_range";
  return null;
}
