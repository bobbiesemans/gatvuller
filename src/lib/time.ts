import { TZDate } from "@date-fns/tz";
import { addDays, startOfDay } from "date-fns";

/** BE and NL share this offset (CET/CEST); all wall-clock logic runs in it, never in server time. */
export const TIME_ZONE = "Europe/Brussels";

const pad = (n: number) => String(n).padStart(2, "0");

export function brusselsDayStart(offsetDays = 0, from: Date = new Date()): Date {
  const local = new TZDate(from.getTime(), TIME_ZONE);
  return new Date(startOfDay(addDays(local, offsetDays)).getTime());
}

export function brusselsDateTime(dayOffset: number, hour: number, minute = 0, from: Date = new Date()): Date {
  const local = addDays(new TZDate(from.getTime(), TIME_ZONE), dayOffset);
  local.setHours(hour, minute, 0, 0);
  return new Date(local.getTime());
}

/** Parses a `datetime-local` value ("YYYY-MM-DDTHH:mm") as Brussels wall-clock time. */
export function parseBrusselsLocal(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const local = new TZDate(y, mo - 1, d, h, mi, 0, TIME_ZONE);
  if (local.getMonth() !== mo - 1 || local.getDate() !== d) return null;
  return new Date(local.getTime());
}

export function toBrusselsLocalInput(date: Date): string {
  const t = new TZDate(date.getTime(), TIME_ZONE);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`;
}

export function brusselsHour(date: Date): number {
  return new TZDate(date.getTime(), TIME_ZONE).getHours();
}

export type DateStyle = "full" | "dayTime" | "time" | "date" | "short";

const STYLES: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  full: { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" },
  dayTime: { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
  time: { hour: "2-digit", minute: "2-digit" },
  date: { day: "numeric", month: "long", year: "numeric" },
  short: { day: "numeric", month: "short" },
};

const INTL_LOCALE: Record<string, string> = { nl: "nl-BE", fr: "fr-BE", en: "en-GB" };

export function intlLocale(locale: string) {
  return INTL_LOCALE[locale] ?? "nl-BE";
}

/** Server/email-safe formatting; UI components use next-intl's formatter with the same zone. */
export function formatInZone(date: Date | string, locale: string, style: DateStyle = "dayTime") {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(intlLocale(locale), { ...STYLES[style], timeZone: TIME_ZONE }).format(d);
}

export function formatRange(start: Date | string, end: Date | string, locale: string) {
  return `${formatInZone(start, locale, "dayTime")} – ${formatInZone(end, locale, "time")}`;
}

/** iCalendar UTC timestamp (YYYYMMDDTHHMMSSZ). */
export function icsStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
