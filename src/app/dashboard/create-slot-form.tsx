"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { discountPercent, formatEuro } from "@/lib/utils";
import { toBrusselsLocalInput } from "@/lib/time";
import { track } from "@/lib/track";

function addHours(h: number, durMin = 45) {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + h);
  const end = new Date(start.getTime() + durMin * 60 * 1000);
  return { start: toBrusselsLocalInput(start), end: toBrusselsLocalInput(end) };
}

const PRESETS = [
  { label: "Over 3 uur", hours: 3 },
  { label: "Over 5 uur", hours: 5 },
  { label: "Morgen 10:00", hours: null as number | null, hour: 10, day: 1 },
  { label: "Morgen 17:00", hours: null as number | null, hour: 17, day: 1 },
];

export type SlotTemplate = {
  id: string;
  salonId: string;
  title: string;
  durationMin: number;
  originalPrice: number;
  discountPrice: number;
};

function atHour(dayOffset: number, hour: number, durMin: number) {
  const start = new Date();
  start.setDate(start.getDate() + dayOffset);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + durMin * 60 * 1000);
  return { start: toBrusselsLocalInput(start), end: toBrusselsLocalInput(end) };
}

export function CreateSlotForm({
  salons,
  templates,
}: {
  salons: { id: string; name: string }[];
  templates: SlotTemplate[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const defaults = addHours(3);
  const [salonId, setSalonId] = useState(salons[0]?.id || "");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(defaults.start);
  const [endsAt, setEndsAt] = useState(defaults.end);
  const [original, setOriginal] = useState(45);
  const [surprise, setSurprise] = useState(29);
  const [capacity, setCapacity] = useState(1);
  const [duration, setDuration] = useState(45);

  const mine = templates.filter((t) => t.salonId === salonId);
  const pct = useMemo(
    () => discountPercent(Math.round(original * 100), Math.round(surprise * 100)),
    [original, surprise]
  );

  function applyDuration(startValue: string, minutes: number) {
    const start = new Date(startValue);
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + minutes * 60 * 1000);
    setEndsAt(toBrusselsLocalInput(end));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(false);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salonId,
        title,
        description: fd.get("description") || undefined,
        startsAt,
        endsAt,
        originalPrice: Math.round(original * 100),
        discountPrice: Math.round(surprise * 100),
        capacity,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Mislukt");
      return;
    }
    track("slot_published", data.slot?.id);
    setOk(true);
    setTitle("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-stone-600">
        Kies een sjabloon of vul titel en prijs in. Tijden gelden voor België en Nederland.
      </p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              const next = p.hours != null ? addHours(p.hours, duration) : atHour(p.day || 1, p.hour || 10, duration);
              setStartsAt(next.start);
              setEndsAt(next.end);
            }}
            className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-800 hover:bg-stone-50"
          >
            {p.label}
          </button>
        ))}
      </div>
      {mine.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {mine.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTitle(t.title);
                setDuration(t.durationMin);
                setOriginal(t.originalPrice / 100);
                setSurprise(t.discountPrice / 100);
                applyDuration(startsAt, t.durationMin);
              }}
              className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-950"
            >
              {t.title} · {formatEuro(t.discountPrice)}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="salonId">Zaak</Label>
          <select
            id="salonId"
            required
            value={salonId}
            onChange={(e) => setSalonId(e.target.value)}
            className="mt-1 flex h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm"
          >
            {salons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="title">Behandeling</Label>
          <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Damesknipbeurt" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="startsAt">Start</Label>
          <Input id="startsAt" type="datetime-local" required value={startsAt} onChange={(e) => { setStartsAt(e.target.value); applyDuration(e.target.value, duration); }} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="endsAt">Einde</Label>
          <Input id="endsAt" type="datetime-local" required value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="originalPrice">Normale prijs (€)</Label>
          <Input id="originalPrice" type="number" step="0.01" min="1" required value={original} onChange={(e) => setOriginal(Number(e.target.value))} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="discountPrice">Last-minute prijs (€)</Label>
          <Input id="discountPrice" type="number" step="0.01" min="1" required value={surprise} onChange={(e) => setSurprise(Number(e.target.value))} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="capacity">Plekken</Label>
          <Input id="capacity" type="number" min="1" max="12" required value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="mt-1" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Toelichting</Label>
          <Input id="description" name="description" className="mt-1" placeholder="Inclusief wassen" />
        </div>
      </div>

      <p className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-700">
        Korting {pct}% · klant betaalt {formatEuro(Math.round(surprise * 100))} · was {formatEuro(Math.round(original * 100))}
      </p>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      {ok && <p className="text-sm font-medium text-emerald-800">Het uur staat online.</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Publiceren…" : "Publiceer vrij uur"}
      </Button>
    </form>
  );
}
