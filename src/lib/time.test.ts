import { describe, expect, it } from "vitest";
import { parseSlotInstant } from "./time";

describe("parseSlotInstant", () => {
  it("reads a datetime-local value as Brussels wall time", () => {
    const winter = parseSlotInstant("2026-01-15T10:00");
    const summer = parseSlotInstant("2026-07-15T10:00");
    expect(winter?.toISOString()).toBe("2026-01-15T09:00:00.000Z");
    expect(summer?.toISOString()).toBe("2026-07-15T08:00:00.000Z");
  });

  it("keeps an absolute ISO instant", () => {
    expect(parseSlotInstant("2026-01-15T09:00:00.000Z")?.toISOString()).toBe("2026-01-15T09:00:00.000Z");
  });
});
