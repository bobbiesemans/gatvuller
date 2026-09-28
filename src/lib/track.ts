"use client";

const NAMES = new Set([
  "offer_viewed",
  "filter_used",
  "booking_started",
  "payment_started",
  "share_clicked",
]);

/** Funnel event without names, emails or payment data. */
export function track(name: string, entityId?: string) {
  if (!NAMES.has(name) || typeof window === "undefined") return;
  const body = JSON.stringify({ name, entityId });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
}
