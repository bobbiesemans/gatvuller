import { prisma } from "./prisma";
import { log } from "./log";

/** The funnel. Client-side events are allowed through /api/events; the rest are recorded on the server only. */
export const CLIENT_EVENTS = ["offer_viewed", "filter_used", "booking_started", "payment_started", "share_clicked"] as const;
export const SERVER_EVENTS = [
  "payment_completed",
  "booking_cancelled",
  "salon_registered",
  "salon_approved",
  "first_slot_published",
  "slot_published",
  "alert_confirmed",
  "customer_registered",
] as const;

export type ClientEvent = (typeof CLIENT_EVENTS)[number];
export type ServerEvent = (typeof SERVER_EVENTS)[number];
export type EventName = ClientEvent | ServerEvent;

type EventFields = { entityType?: "slot" | "salon" | "filter"; entityId?: string | null; source?: string | null };

/** Stores an event without any personal data. Never throws. */
export async function recordEvent(name: EventName, fields: EventFields = {}) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        name,
        entityType: fields.entityType ?? null,
        entityId: fields.entityId ? fields.entityId.slice(0, 64) : null,
        source: fields.source ? fields.source.replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || null : null,
      },
    });
  } catch (error) {
    log.warn("analytics.record_failed", { name, error });
  }
}

export type FunnelRow = { name: string; count: number };

export async function funnel(since: Date): Promise<FunnelRow[]> {
  const rows = await prisma.analyticsEvent.groupBy({
    by: ["name"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });
  return rows.map((r) => ({ name: r.name, count: r._count._all }));
}
