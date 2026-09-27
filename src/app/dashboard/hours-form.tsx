"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const ORDER = [1, 2, 3, 4, 5, 6, 0];
const NAMES = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];

type Day = { weekday: number; openMin: number; closeMin: number; closed: boolean };

function minutesLabel(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function toMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function HoursForm({ salonId, initial }: { salonId: string; initial: Day[] }) {
  const router = useRouter();
  const [days, setDays] = useState<Day[]>(
    ORDER.map((weekday) => initial.find((d) => d.weekday === weekday) || { weekday, openMin: 9 * 60, closeMin: 18 * 60, closed: weekday === 0 })
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    setError(null);
    setOk(false);
    const res = await fetch("/api/salon/hours", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salonId, days }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Opslaan mislukt");
      return;
    }
    setOk(true);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {days.map((day, index) => (
        <div key={day.weekday} className="grid grid-cols-[7rem_1fr_1fr_auto] items-center gap-2 text-sm">
          <span className="capitalize text-stone-700">{NAMES[day.weekday]}</span>
          <input
            type="time"
            aria-label={`${NAMES[day.weekday]} open`}
            disabled={day.closed}
            value={minutesLabel(day.openMin)}
            onChange={(e) => setDays((rows) => rows.map((row, i) => (i === index ? { ...row, openMin: toMinutes(e.target.value) } : row)))}
            className="h-10 rounded-lg border border-stone-200 px-2 disabled:bg-stone-100"
          />
          <input
            type="time"
            aria-label={`${NAMES[day.weekday]} sluit`}
            disabled={day.closed}
            value={minutesLabel(day.closeMin)}
            onChange={(e) => setDays((rows) => rows.map((row, i) => (i === index ? { ...row, closeMin: toMinutes(e.target.value) } : row)))}
            className="h-10 rounded-lg border border-stone-200 px-2 disabled:bg-stone-100"
          />
          <label className="flex items-center gap-1 text-xs text-stone-600">
            <input
              type="checkbox"
              checked={day.closed}
              onChange={(e) => setDays((rows) => rows.map((row, i) => (i === index ? { ...row, closed: e.target.checked } : row)))}
            />
            dicht
          </label>
        </div>
      ))}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {ok && <p className="text-sm text-emerald-800">Openingstijden opgeslagen.</p>}
      <Button type="button" onClick={save} disabled={loading} size="sm">
        {loading ? "Opslaan…" : "Openingstijden opslaan"}
      </Button>
    </div>
  );
}
