import { describe, expect, it } from "vitest";
import { groupBookings } from "./booking-groups";

const now = new Date("2026-09-29T10:00:00Z"); // 12:00 in Brussels
const at = (iso: string, minutes = 45) => ({ startsAt: new Date(iso), endsAt: new Date(new Date(iso).getTime() + minutes * 60_000) });

describe("groupBookings", () => {
  it("orders today, tomorrow, later ascending, then earlier descending", () => {
    const items = [
      { id: "later2", ...at("2026-10-02T09:00:00Z") },
      { id: "old1", ...at("2026-09-20T09:00:00Z") },
      { id: "today2", ...at("2026-09-29T15:00:00Z") },
      { id: "tomorrow", ...at("2026-09-30T09:00:00Z") },
      { id: "today1", ...at("2026-09-29T12:00:00Z") },
      { id: "old2", ...at("2026-09-28T09:00:00Z") },
      { id: "later1", ...at("2026-10-01T09:00:00Z") },
    ];
    const groups = groupBookings(items, now);
    expect(groups.map((g) => g.key)).toEqual(["today", "tomorrow", "later", "earlier"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["today1", "today2"]);
    expect(groups[2].items.map((i) => i.id)).toEqual(["later1", "later2"]);
    expect(groups[3].items.map((i) => i.id)).toEqual(["old2", "old1"]);
  });

  it("keeps a running appointment under today and drops empty groups", () => {
    const groups = groupBookings([{ id: "running", ...at("2026-09-29T09:30:00Z", 60) }], now);
    expect(groups.map((g) => g.key)).toEqual(["today"]);
  });
});
