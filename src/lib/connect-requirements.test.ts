import { describe, expect, it } from "vitest";
import { payoutHealth, requirementGroups } from "./connect-requirements";

const base = { chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false, requirementsDue: [] as string[], disabledReason: null as string | null };

describe("requirementGroups", () => {
  it("turns Stripe field paths into a few plain groups", () => {
    expect(
      requirementGroups(["external_account", "individual.verification.document", "individual.dob.day", "tos_acceptance.date", "business_profile.url", "company.tax_id", "individual.first_name"])
    ).toEqual(["bank", "identity", "person", "terms", "business", "tax"]);
  });
  it("falls back to other", () => {
    expect(requirementGroups(["something.new"])).toEqual(["other"]);
  });
});

describe("payoutHealth", () => {
  it("is active only when everything is on and nothing is due", () => {
    expect(payoutHealth({ ...base, chargesEnabled: true, payoutsEnabled: true })).toBe("active");
  });
  it("is incomplete while onboarding is unfinished", () => {
    expect(payoutHealth({ ...base, requirementsDue: ["external_account"], disabledReason: "requirements.past_due" })).toBe("incomplete");
  });
  it("is restricted when Stripe disabled the account after submission", () => {
    expect(payoutHealth({ ...base, detailsSubmitted: true, disabledReason: "rejected.other" })).toBe("restricted");
  });
  it("separates payments from payouts", () => {
    expect(payoutHealth({ ...base, chargesEnabled: true, detailsSubmitted: true })).toBe("payoutsOff");
  });
});
