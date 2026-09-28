import { TZDate } from "@date-fns/tz";
import { addDays, startOfDay } from "date-fns";

/**
 * Belgium (Europe/Brussels) and the Netherlands (Europe/Amsterdam) follow the same CET/CEST rules,
 * so every wall-clock calculation runs in one zone and never in server time (UTC on Vercel).
 */
export const TIME_ZONE = "Europe/Brussels";

const pad = (n: number) => String(n).padStart(2, "0");

const INTL_LOCALE: Record<string, string> = { nl: "nl-BE", fr: "fr-BE", en: "en-GB" };

export function intlLocale(locale: string) {
  return INTL_LOCALE[locale] ?? "nl-BE";
}

export function brusselsDayStart(offsetDays = 0, from: Date = new Date()): Date {
  const local = new TZDate(from.getTime(), TIME_ZONE);
  return new Date(startOfDay(addDays(local, offsetDays)).getTime());
}

export function brusselsDateTime(dayOffset: number, hour: number, minute = 0, from: Date = new Date()): Date {
  const local = addDays(new TZDate(from.getTime(), TIME_ZONE), dayOffset);
  local.setHours(hour, minute, 0, 0);
  return new Date(local.getTime());
}

/** Wall-clock parts in Brussels. `weekday` is 0 for Sunday, like Date#getDay. */
export function brusselsParts(date: Date) {
  const t = new TZDate(date.getTime(), TIME_ZONE);
  return {
    year: t.getFullYear(),
    month: t.getMonth() + 1,
    day: t.getDate(),
    hour: t.getHours(),
    minute: t.getMinutes(),
    weekday: t.getDay(),
    minutesOfDay: t.getHours() * 60 + t.getMinutes(),
  };
}

/** Parses a `datetime-local` value ("YYYY-MM-DDTHH:mm") as Brussels wall-clock time. */
export function parseBrusselsLocal(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (h > 23 || mi > 59) return null;
  const local = new TZDate(y, mo - 1, d, h, mi, 0, TIME_ZONE);
  if (local.getMonth() !== mo - 1 || local.getDate() !== d || local.getHours() !== h) return null;
  return new Date(local.getTime());
}

export function toBrusselsLocalInput(date: Date): string {
  const t = new TZDate(date.getTime(), TIME_ZONE);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`;
}

export function brusselsHour(date: Date): number {
  return new TZDate(date.getTime(), TIME_ZONE).getHours();
}

/** ISO instants stay absolute. Values without a zone are Brussels wall time (salon forms). */
export function parseSlotInstant(value: string): Date | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) return parseBrusselsLocal(trimmed);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(trimmed)) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** The next quarter of an hour after `from` plus `minMinutes`, as an instant. */
export function nextQuarterHour(from: Date = new Date(), minMinutes = 30) {
  const ms = 15 * 60 * 1000;
  return new Date(Math.ceil((from.getTime() + minMinutes * 60 * 1000) / ms) * ms);
}

export type DayBucket = "today" | "tomorrow" | "later";

export function dayBucket(date: Date, now: Date = new Date()): DayBucket {
  if (date < brusselsDayStart(1, now)) return "today";
  if (date < brusselsDayStart(2, now)) return "tomorrow";
  return "later";
}

export type DateStyle = "full" | "dayTime" | "time" | "date" | "short" | "weekday" | "dayMonth";

const STYLES: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  full: { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" },
  dayTime: { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
  time: { hour: "2-digit", minute: "2-digit" },
  date: { day: "numeric", month: "long", year: "numeric" },
  short: { day: "numeric", month: "short" },
  weekday: { weekday: "long" },
  dayMonth: { weekday: "long", day: "numeric", month: "long" },
};

/** Server- and e-mail-safe formatting, always in the Belgian zone. */
export function formatInZone(date: Date | string, locale: string, style: DateStyle = "dayTime") {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(intlLocale(locale), { ...STYLES[style], timeZone: TIME_ZONE }).format(d);
}

export function formatRange(start: Date | string, end: Date | string, locale: string) {
  return `${formatInZone(start, locale, "dayTime")} – ${formatInZone(end, locale, "time")}`;
}

export function formatTimeRange(start: Date | string, end: Date | string, locale: string) {
  return `${formatInZone(start, locale, "time")}–${formatInZone(end, locale, "time")}`;
}

/** iCalendar UTC timestamp (YYYYMMDDTHHMMSSZ). */
export function icsStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function minutesBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}
