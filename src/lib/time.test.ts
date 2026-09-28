import { describe, expect, it } from "vitest";
import { formatInZone, parseSlotInstant } from "./time";

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

describe("formatInZone", () => {
  it("shows Brussels wall-clock time whatever the server zone is (Vercel runs in UTC)", () => {
    // 12:00 UTC on 29 September is 14:00 in Brussels (CEST).
    expect(formatInZone(new Date("2026-09-29T12:00:00Z"), "nl", "time")).toBe("14:00");
    // 12:00 UTC on 15 January is 13:00 in Brussels (CET).
    expect(formatInZone(new Date("2026-01-15T12:00:00Z"), "fr", "time")).toBe("13:00");
  });
});
