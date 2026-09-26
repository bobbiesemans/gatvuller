"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEuro } from "@/lib/utils";
import Link from "next/link";

export function BookForm({
  slotId, price, defaultName, defaultEmail, loggedIn,
}: {
  slotId: string; price: number; defaultName: string; defaultEmail: string; loggedIn: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
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
      if (data.url) { window.location.href = data.url; return; }
      if (data.demoPaid) {
        window.location.href = `/boeking/succes?bookingId=${data.bookingId}&demo=1`;
        return;
      }
      throw new Error("Geen checkout URL");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fout");
      setLoading(false);
    }
  }

  if (!loggedIn) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-slate-600">Log in om te boeken.</p>
        <Button asChild className="w-full">
          <Link href={`/login?callbackUrl=/slots/${slotId}`}>Inloggen om te boeken</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="name">Naam</Label>
        <Input id="name" name="name" required defaultValue={defaultName} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required defaultValue={defaultEmail} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="phone">Telefoon</Label>
        <Input id="phone" name="phone" type="tel" className="mt-1" placeholder="+32…" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Bezig…" : `Betaal ${formatEuro(price)} & boek`}
      </Button>
      <p className="text-xs text-slate-400 text-center">Zonder Stripe keys: demo-boeking.</p>
    </form>
  );
}
