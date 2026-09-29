export type RequirementGroup = "bank" | "terms" | "identity" | "person" | "business" | "tax" | "other";

/** Stripe lists what it still needs as dotted field paths. The owner gets a few plain-word groups instead. */
export function requirementGroup(field: string): RequirementGroup {
  const f = field.toLowerCase();
  if (f.startsWith("external_account")) return "bank";
  if (f.startsWith("tos_acceptance")) return "terms";
  if (f.includes("verification") || f.includes("document")) return "identity";
  if (f.includes("tax_id") || f.includes("vat")) return "tax";
  if (f.startsWith("business_profile") || f.startsWith("company")) return "business";
  if (f.startsWith("individual") || f.startsWith("representative") || f.startsWith("person") || f.startsWith("owners")) return "person";
  return "other";
}

export function requirementGroups(fields: string[]): RequirementGroup[] {
  return [...new Set(fields.map(requirementGroup))];
}

export type PayoutHealth = "active" | "payoutsOff" | "restricted" | "incomplete";

type ConnectSnapshot = {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsDue: string[];
  disabledReason: string | null;
};

/** One plain state for a connected account. `restricted`: Stripe switched something off after the details were sent. */
export function payoutHealth(state: ConnectSnapshot): PayoutHealth {
  if (state.chargesEnabled && state.payoutsEnabled && state.requirementsDue.length === 0) return "active";
  const stripeStopped = state.detailsSubmitted && state.disabledReason && !state.disabledReason.startsWith("requirements.");
  if (stripeStopped) return "restricted";
  if (state.chargesEnabled) return "payoutsOff";
  return "incomplete";
}
