"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useErrorText } from "@/lib/i18n/use-error-text";
import { intlLocale } from "@/lib/time";

const ORDER = [1, 2, 3, 4, 5, 6, 0];

type Day = { weekday: number; openMin: number; closeMin: number; closed: boolean };

function minutesLabel(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function toMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : 0;
}

const timeInput = "h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm disabled:bg-stone-100 disabled:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";

export function HoursForm({ salonId, initial }: { salonId: string; initial: Day[] }) {
  const t = useTranslations("ui.dashboard.manage");
  const locale = useLocale();
  const errorText = useErrorText();
  const router = useRouter();
  const [days, setDays] = useState<Day[]>(
    ORDER.map((weekday) => initial.find((d) => d.weekday === weekday) || { weekday, openMin: 9 * 60, closeMin: 18 * 60, closed: weekday === 0 })
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  // 7 January 2024 was a Sunday: weekday 0 matches Date#getDay.
  const dayName = (weekday: number) =>
    new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 7 + weekday)));

  async function save() {
    setMessage(null);
    const bad = days.find((d) => !d.closed && d.closeMin <= d.openMin);
    if (bad) {
      setMessage({ tone: "error", text: t("hoursInvalid", { day: dayName(bad.weekday) }) });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/salon/hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonId, days }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: "error", text: errorText(data.error) });
        return;
      }
      setMessage({ tone: "info", text: t("hoursSaved") });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: errorText("generic") });
    } finally {
      setBusy(false);
    }
  }

  const update = (index: number, patch: Partial<Day>) => setDays((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className="space-y-3">
      {days.map((day, index) => {
        const name = dayName(day.weekday);
        return (
          <div key={day.weekday} className="grid grid-cols-2 items-center gap-2 rounded-xl border border-stone-200 p-3 text-sm sm:grid-cols-[8rem_1fr_1fr_auto] sm:border-0 sm:p-0">
            <span className="font-medium capitalize text-ink">{name}</span>
            <label className="flex min-h-11 items-center justify-end gap-2 text-stone-700 sm:order-last sm:justify-start">
              <input type="checkbox" className="h-5 w-5 accent-[#b4492b]" checked={day.closed} onChange={(e) => update(index, { closed: e.target.checked })} />
              {t("hoursClosed")}
            </label>
            <input
              type="time"
              aria-label={t("hoursOpen", { day: name })}
              disabled={day.closed}
              value={minutesLabel(day.openMin)}
              onChange={(e) => update(index, { openMin: toMinutes(e.target.value) })}
              className={timeInput}
            />
            <input
              type="time"
              aria-label={t("hoursClose", { day: name })}
              disabled={day.closed}
              value={minutesLabel(day.closeMin)}
              onChange={(e) => update(index, { closeMin: toMinutes(e.target.value) })}
              className={timeInput}
            />
          </div>
        );
      })}
      <div aria-live="polite">{message && <Notice tone={message.tone}>{message.text}</Notice>}</div>
      <Button type="button" onClick={save} disabled={busy} className="w-full sm:w-fit">
        {busy ? t("saving") : t("saveHours")}
      </Button>
    </div>
  );
}
