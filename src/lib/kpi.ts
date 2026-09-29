/**
 * Owner dashboard figures. Pure functions over plain rows, so the arithmetic is unit tested and the
 * page only fetches. Amounts are integer cents. "Paid" means PAID or NO_SHOW: a no-show keeps the money.
 * Everything is counted for appointments whose slot ended in the period; what is still to come is
 * reported separately, so a busy week ahead never inflates the past.
 */

export const KPI_PERIODS = ["7d", "30d", "all"] as const;
export type KpiPeriod = (typeof KPI_PERIODS)[number];
export const DEFAULT_KPI_PERIOD: KpiPeriod = "30d";

export function parsePeriod(value: unknown): KpiPeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  return (KPI_PERIODS as readonly string[]).includes(raw as string) ? (raw as KpiPeriod) : DEFAULT_KPI_PERIOD;
}

/** Start of the period as an instant, or null for "all time". */
export function periodStart(period: KpiPeriod, now: Date = new Date()): Date | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : 30;
  return new Date(now.getTime() - days * 86_400_000);
}

export type KpiBooking = {
  slotId: string;
  amount: number;
  feeAmount: number;
  status: string;
  paymentMode: "LIVE" | "TEST" | "DEMO";
  slotStartsAt: Date;
  slotEndsAt: Date;
};

export type KpiSlot = {
  id: string;
  capacity: number;
  endsAt: Date;
  status: string;
  /** The salon takes real payments (Stripe live). Everything else is test or demo. */
  live: boolean;
};

export type Kpi = {
  /** Paid by customers for appointments that ended in the period. */
  revenue: number;
  /** Revenue minus the platform commission recorded on each booking. */
  net: number;
  /** Booked spots (paid, including no-shows). */
  filledSpots: number;
  /** Hours of otherwise empty time: the duration of each slot with at least one paid booking, counted once. */
  hoursSaved: number;
  /** Spots offered in slots that ended in the period. */
  capacity: number;
  /** Filled share of `capacity`, 0 to 100, or null when nothing was offered. */
  occupancy: number | null;
  noShows: number;
  /** Paid bookings still to come (slots that have not ended). */
  upcomingCount: number;
  upcomingAmount: number;
};

const isPaid = (b: Pick<KpiBooking, "status">) => b.status === "PAID" || b.status === "NO_SHOW";

export function emptyKpi(): Kpi {
  return { revenue: 0, net: 0, filledSpots: 0, hoursSaved: 0, capacity: 0, occupancy: null, noShows: 0, upcomingCount: 0, upcomingAmount: 0 };
}

export function hasActivity(k: Kpi) {
  return k.filledSpots > 0 || k.capacity > 0 || k.upcomingCount > 0;
}

export function computeKpis(
  bookings: KpiBooking[],
  slots: KpiSlot[],
  period: KpiPeriod,
  now: Date = new Date()
): { live: Kpi; test: Kpi } {
  const from = periodStart(period, now);
  const inPeriod = (endsAt: Date) => endsAt.getTime() <= now.getTime() && (from === null || endsAt.getTime() >= from.getTime());

  const live = emptyKpi();
  const test = emptyKpi();
  const bucket = (mode: KpiBooking["paymentMode"]) => (mode === "LIVE" ? live : test);

  const savedSlots = { live: new Map<string, number>(), test: new Map<string, number>() };
  const takenBySlot = new Map<string, number>();

  for (const b of bookings) {
    if (!isPaid(b)) continue;
    const k = bucket(b.paymentMode);
    if (b.slotEndsAt.getTime() > now.getTime()) {
      k.upcomingCount += 1;
      k.upcomingAmount += b.amount;
      continue;
    }
    if (!inPeriod(b.slotEndsAt)) continue;
    k.revenue += b.amount;
    k.net += Math.max(0, b.amount - b.feeAmount);
    k.filledSpots += 1;
    if (b.status === "NO_SHOW") k.noShows += 1;
    const minutes = Math.max(0, (b.slotEndsAt.getTime() - b.slotStartsAt.getTime()) / 60_000);
    (b.paymentMode === "LIVE" ? savedSlots.live : savedSlots.test).set(b.slotId, minutes);
    takenBySlot.set(b.slotId, (takenBySlot.get(b.slotId) ?? 0) + 1);
  }

  for (const [key, k] of [["live", live], ["test", test]] as const) {
    let minutes = 0;
    for (const value of savedSlots[key].values()) minutes += value;
    k.hoursSaved = minutes / 60;
  }

  const taken = { live: 0, test: 0 };
  for (const s of slots) {
    if (s.status === "CANCELLED" || !inPeriod(s.endsAt) || s.capacity < 1) continue;
    const k = s.live ? live : test;
    k.capacity += s.capacity;
    taken[s.live ? "live" : "test"] += Math.min(s.capacity, takenBySlot.get(s.id) ?? 0);
  }
  for (const [key, k] of [["live", live], ["test", test]] as const) {
    k.occupancy = k.capacity > 0 ? Math.round((taken[key] / k.capacity) * 100) : null;
  }
  return { live, test };
}
