"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { discountPercent, formatEuro } from "@/lib/utils";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addHours(h: number, durMin = 45) {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + h);
  const end = new Date(start.getTime() + durMin * 60 * 1000);
  return { start: toLocalInput(start), end: toLocalInput(end) };
}

const PRESETS = [
  { label: "Vanavond +3u", ...addHours(3) },
  { label: "Vanavond +5u", ...addHours(5) },
  { label: "Morgen 10:00", start: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return toLocalInput(d); })(), end: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 45, 0, 0); return toLocalInput(d); })() },
  { label: "Morgen 17:00", start: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(17, 0, 0, 0); return toLocalInput(d); })(), end: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(17, 45, 0, 0); return toLocalInput(d); })() },
];

export function CreateSlotForm({ salons }: { salons: { id: string; name: string }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const defaults = addHours(3);
  const [startsAt, setStartsAt] = useState(defaults.start);
  const [endsAt, setEndsAt] = useState(defaults.end);
  const [original, setOriginal] = useState(45);
  const [surprise, setSurprise] = useState(29);

  const pct = useMemo(
    () => discountPercent(Math.round(original * 100), Math.round(surprise * 100)),
    [original, surprise]
  );

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
        salonId: fd.get("salonId"),
        title: fd.get("title"),
        description: fd.get("description") || undefined,
        startsAt: new Date(String(fd.get("startsAt"))).toISOString(),
        endsAt: new Date(String(fd.get("endsAt"))).toISOString(),
        originalPrice: Math.round(Number(fd.get("originalPrice")) * 100),
        discountPrice: Math.round(Number(fd.get("discountPrice")) * 100),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Mislukt");
      return;
    }
    setOk(true);
    (e.target as HTMLFormElement).reset();
    const next = addHours(3);
    setStartsAt(next.start);
    setEndsAt(next.end);
    setOriginal(45);
    setSurprise(29);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
        <p className="text-sm font-semibold text-violet-900">Post een Surprise slot in minder dan 30 seconden</p>
        <p className="text-xs text-violet-700/80 mt-1">
          Kies preset → titel → originele + Surprise-prijs → publiceren.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setStartsAt(p.start);
                setEndsAt(p.end);
              }}
              className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-100"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Salon</Label>
          <select
            name="salonId"
            required
            className="mt-1 flex h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
          >
            {salons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label>Titel behandeling</Label>
          <Input name="title" required placeholder="bijv. Damesknipbeurt" className="mt-1" />
        </div>
        <div>
          <Label>Start (tijdvenster)</Label>
          <Input
            name="startsAt"
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Einde</Label>
          <Input
            name="endsAt"
            type="datetime-local"
            required
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Normale prijs (€)</Label>
          <Input
            name="originalPrice"
            type="number"
            step="0.01"
            min="1"
            required
            value={original}
            onChange={(e) => setOriginal(Number(e.target.value))}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Surprise / last-minute prijs (€)</Label>
          <Input
            name="discountPrice"
            type="number"
            step="0.01"
            min="1"
            required
            value={surprise}
            onChange={(e) => setSurprise(Number(e.target.value))}
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Beschrijving (optioneel)</Label>
          <Input name="description" className="mt-1" placeholder="Incl. wassen & föhnen" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <span>
          Korting: <strong className="text-emerald-700">-{pct}%</strong> · Klant betaalt{" "}
          <strong>{formatEuro(Math.round(surprise * 100))}</strong>
        </span>
        <span className="text-slate-500">Was {formatEuro(Math.round(original * 100))}</span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && (
        <p className="text-sm text-emerald-600 font-medium">
          Slot gepost! Zichtbaar op de kaart & in de browse.
        </p>
      )}
      <Button type="submit" className="w-full sm:w-auto" disabled={loading} size="lg">
        {loading ? "Posten…" : "Publiceer Surprise slot"}
      </Button>
    </form>
  );
}
