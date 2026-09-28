"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEuro } from "@/lib/utils";
import { track } from "@/lib/track";

export function BookForm({
  slotId,
  price,
  originalPrice,
  feePercent,
  cancellationHours,
  demoMode,
  defaultName,
  defaultEmail,
  loggedIn,
}: {
  slotId: string;
  price: number;
  originalPrice: number;
  feePercent: number;
  cancellationHours: number;
  demoMode: boolean;
  defaultName: string;
  defaultEmail: string;
  loggedIn: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    track("booking_started", slotId);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          customerName: fd.get("name"),
          customerEmail: fd.get("email"),
          customerPhone: fd.get("phone"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Boeken mislukt");
      if (data.url) {
        track("payment_started", slotId);
        window.location.href = data.url;
        return;
      }
      if (data.kind === "confirmed") {
        window.location.href = `/boeking/succes?bookingId=${data.bookingId}`;
        return;
      }
      throw new Error("Geen betaalpagina");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fout");
      setLoading(false);
    }
  }

  if (!loggedIn) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-stone-600">Log in om dit uur te reserveren.</p>
        <Button asChild className="w-full">
          <Link href={`/login?callbackUrl=/slots/${slotId}`}>Inloggen</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <dl className="space-y-1 text-sm text-stone-700">
        <div className="flex justify-between"><dt>Normale prijs</dt><dd>{formatEuro(originalPrice)}</dd></div>
        <div className="flex justify-between font-semibold text-stone-950"><dt>Jij betaalt</dt><dd>{formatEuro(price)}</dd></div>
        <div className="flex justify-between text-stone-500"><dt>Platformkosten voor de zaak</dt><dd>{feePercent}%</dd></div>
      </dl>
      <p className="text-xs text-stone-500">
        Annuleren kan tot {cancellationHours} uur voor de start. Daarna en bij no-show is er geen terugbetaling.
      </p>
      <div>
        <Label htmlFor="name">Naam</Label>
        <Input id="name" name="name" required autoComplete="name" defaultValue={defaultName} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" defaultValue={defaultEmail} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="phone">Telefoon</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" className="mt-1" />
      </div>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Bezig…" : `Reserveer voor ${formatEuro(price)}`}
      </Button>
      <p className="text-center text-xs text-stone-500">
        {demoMode
          ? "Testmodus: de betaling wordt gesimuleerd en dat staat op de bevestiging."
          : "Je gaat naar Stripe. De plek blijft gereserveerd tot de betaling bevestigd is."}
      </p>
    </form>
  );
}
