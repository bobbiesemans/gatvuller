import { describe, expect, it } from "vitest";
import { computeKpis, hasActivity, parsePeriod, periodStart, type KpiBooking, type KpiSlot } from "./kpi";

const now = new Date("2026-09-29T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

function booking(over: Partial<KpiBooking> = {}): KpiBooking {
  return {
    slotId: "s1",
    amount: 3000,
    feeAmount: 540,
    status: "PAID",
    paymentMode: "LIVE",
    slotStartsAt: hoursAgo(3),
    slotEndsAt: hoursAgo(2),
    ...over,
  };
}
const slot = (over: Partial<KpiSlot> = {}): KpiSlot => ({ id: "s1", capacity: 2, endsAt: hoursAgo(2), status: "BOOKED", live: true, ...over });

describe("parsePeriod", () => {
  it("accepts the three periods and falls back to 30 days", () => {
    expect(parsePeriod("7d")).toBe("7d");
    expect(parsePeriod("all")).toBe("all");
    expect(parsePeriod(["7d", "x"])).toBe("7d");
    expect(parsePeriod("year")).toBe("30d");
    expect(parsePeriod(undefined)).toBe("30d");
  });
  it("computes the start of the period", () => {
    expect(periodStart("all", now)).toBeNull();
    expect(periodStart("7d", now)?.toISOString()).toBe("2026-09-22T12:00:00.000Z");
  });
});

describe("computeKpis", () => {
  it("adds up revenue, net, spots, hours and occupancy", () => {
    const { live } = computeKpis([booking(), booking({ amount: 2000, feeAmount: 360 })], [slot()], "30d", now);
    expect(live.revenue).toBe(5000);
    expect(live.net).toBe(5000 - 900);
    expect(live.filledSpots).toBe(2);
    expect(live.hoursSaved).toBe(1);
    expect(live.capacity).toBe(2);
    expect(live.occupancy).toBe(100);
  });

  it("counts the hours of a slot once, however many customers booked it", () => {
    const { live } = computeKpis([booking(), booking()], [slot({ capacity: 4 })], "30d", now);
    expect(live.hoursSaved).toBe(1);
    expect(live.occupancy).toBe(50);
  });

  it("keeps live apart from test and demo", () => {
    const rows = [booking(), booking({ slotId: "s2", paymentMode: "DEMO", amount: 1000, feeAmount: 180 }), booking({ slotId: "s3", paymentMode: "TEST" })];
    const { live, test } = computeKpis(rows, [slot(), slot({ id: "s2", live: false }), slot({ id: "s3", live: false })], "all", now);
    expect(live.revenue).toBe(3000);
    expect(test.revenue).toBe(4000);
    expect(test.filledSpots).toBe(2);
  });

  it("ignores refunded, cancelled and pending bookings", () => {
    const rows = ["REFUNDED", "CANCELLED", "PENDING", "EXPIRED"].map((status) => booking({ status }));
    const { live } = computeKpis(rows, [slot()], "30d", now);
    expect(live.revenue).toBe(0);
    expect(live.filledSpots).toBe(0);
    expect(live.occupancy).toBe(0);
  });

  it("keeps the money of a no-show and counts it", () => {
    const { live } = computeKpis([booking({ status: "NO_SHOW" })], [slot({ capacity: 1 })], "30d", now);
    expect(live.revenue).toBe(3000);
    expect(live.noShows).toBe(1);
  });

  it("respects the period and reports upcoming bookings apart", () => {
    const old = booking({ slotId: "old", slotStartsAt: hoursAgo(24 * 20 + 1), slotEndsAt: hoursAgo(24 * 20) });
    const future = booking({ slotId: "next", slotStartsAt: new Date(now.getTime() + 3_600_000), slotEndsAt: new Date(now.getTime() + 7_200_000) });
    const oldSlot = slot({ id: "old", endsAt: old.slotEndsAt });
    const week = computeKpis([old, future], [oldSlot], "7d", now).live;
    expect(week.revenue).toBe(0);
    expect(week.capacity).toBe(0);
    expect(week.occupancy).toBeNull();
    expect(week.upcomingCount).toBe(1);
    expect(week.upcomingAmount).toBe(3000);
    expect(computeKpis([old, future], [oldSlot], "30d", now).live.revenue).toBe(3000);
  });

  it("leaves withdrawn slots out of the occupancy and reports no activity for nothing", () => {
    const { live, test } = computeKpis([], [slot({ status: "CANCELLED" })], "all", now);
    expect(live.capacity).toBe(0);
    expect(hasActivity(live)).toBe(false);
    expect(hasActivity(test)).toBe(false);
  });
});
