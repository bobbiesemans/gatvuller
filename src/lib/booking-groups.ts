import { dayBucket, type DayBucket } from "./time";

export type GroupKey = DayBucket | "earlier";
export type Groupable = { startsAt: Date; endsAt: Date };

/**
 * Bookings page order: what is still to come first (today, tomorrow, later; earliest first), then what
 * is over (latest first). A slot that has started but not ended still counts as today. Empty groups are dropped.
 */
export function groupBookings<T extends Groupable>(items: T[], now: Date = new Date()): { key: GroupKey; items: T[] }[] {
  const upcoming = items.filter((i) => i.endsAt.getTime() > now.getTime()).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const earlier = items.filter((i) => i.endsAt.getTime() <= now.getTime()).sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  const groups: { key: GroupKey; items: T[] }[] = [
    { key: "today", items: [] },
    { key: "tomorrow", items: [] },
    { key: "later", items: [] },
    { key: "earlier", items: earlier },
  ];
  for (const item of upcoming) {
    // Already running: today, whatever the start says.
    const bucket = item.startsAt.getTime() <= now.getTime() ? "today" : dayBucket(item.startsAt, now);
    groups.find((g) => g.key === bucket)!.items.push(item);
  }
  return groups.filter((g) => g.items.length > 0);
}
