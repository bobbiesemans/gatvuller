import type { Salon, Slot } from "@prisma/client";
import { slotVisibility, type SlotVisibility } from "./marketplace";

export type OwnerVisibility = SlotVisibility | "withdrawn";

/**
 * What the owner sees per offer. A finished or withdrawn offer says so first, whatever the state of the
 * business: nobody needs to hear that a slot from last week is waiting for approval.
 */
export function ownerVisibility(
  slot: Pick<Slot, "status" | "spotsLeft" | "startsAt" | "endsAt">,
  salon: Pick<Salon, "status" | "isDemo" | "stripeAccountId" | "stripeChargesEnabled">,
  now = new Date()
): OwnerVisibility {
  if (slot.status === "CANCELLED") return "withdrawn";
  if (slot.status === "EXPIRED" || slot.endsAt <= now) return "ended";
  return slotVisibility(slot, salon, now);
}
