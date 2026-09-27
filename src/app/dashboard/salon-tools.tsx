"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CancellationForm({ salonId, hours }: { salonId: string; hours: number }) {
  const router = useRouter();
  const [value, setValue] = useState(hours);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setMessage(null);
    const res = await fetch("/api/salon/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salonId, cancellationHours: value }),
    });
    setMessage(res.ok ? "Annuleringstermijn opgeslagen." : "Opslaan mislukt.");
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor={`cancel-${salonId}`}>Annuleren tot (uur voor start)</Label>
        <Input id={`cancel-${salonId}`} className="mt-1 w-28" type="number" min={1} max={72} value={value} onChange={(e) => setValue(Number(e.target.value))} />
      </div>
      <Button type="button" size="sm" variant="outline" onClick={save}>Opslaan</Button>
      {message && <p className="text-sm text-stone-600">{message}</p>}
    </div>
  );
}

export function TemplateForm({ salonId }: { salonId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/salon/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salonId,
        title: fd.get("title"),
        durationMin: Number(fd.get("durationMin")),
        originalPrice: Math.round(Number(fd.get("original")) * 100),
        discountPrice: Math.round(Number(fd.get("discount")) * 100),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "price_invalid" ? "Kortingsprijs is te hoog." : "Sjabloon niet opgeslagen.");
      return;
    }
    setError(null);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-5 sm:items-end">
      <div className="sm:col-span-2">
        <Label htmlFor={`tpl-${salonId}`}>Behandeling</Label>
        <Input id={`tpl-${salonId}`} name="title" required className="mt-1" placeholder="Knipbeurt" />
      </div>
      <div>
        <Label htmlFor={`dur-${salonId}`}>Minuten</Label>
        <Input id={`dur-${salonId}`} name="durationMin" type="number" min={10} max={480} defaultValue={45} required className="mt-1" />
      </div>
      <div>
        <Label htmlFor={`orig-${salonId}`}>Normaal €</Label>
        <Input id={`orig-${salonId}`} name="original" type="number" min={1} step="0.01" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor={`disc-${salonId}`}>Korting €</Label>
        <Input id={`disc-${salonId}`} name="discount" type="number" min={1} step="0.01" required className="mt-1" />
      </div>
      <Button type="submit" size="sm" className="sm:col-span-5 sm:w-fit">Sjabloon bewaren</Button>
      {error && <p className="text-sm text-red-700 sm:col-span-5">{error}</p>}
    </form>
  );
}

export function PayoutButton({ salonId, configured }: { salonId: string; configured: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/stripe/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salonId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok || !data.url) {
      setError(configured ? "Stripe Connect is nu niet bereikbaar." : "Stripe is nog niet geconfigureerd. Uitbetalingen blijven in testmodus.");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={start} disabled={loading || !configured}>
        {loading ? "Bezig…" : "Stripe-uitbetaling koppelen"}
      </Button>
      {error && <p className="text-sm text-stone-600">{error}</p>}
    </div>
  );
}
