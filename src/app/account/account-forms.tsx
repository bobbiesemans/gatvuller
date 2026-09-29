"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ERRORS: Record<string, string> = {
  upcoming_bookings: "Je hebt nog een betaalde afspraak die niet voorbij is. Annuleer die eerst of wacht tot ze voorbij is.",
  owns_salon: "Je beheert nog een zaak. Neem contact op, zodat we de uitbetalingen eerst kunnen afronden.",
};

export function ProfileForm({ name, phone, locale }: { name: string; phone: string; locale: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fd.get("name"), phone: fd.get("phone"), locale: fd.get("locale") }),
    });
    setMsg(res.ok ? "Opgeslagen." : "Opslaan mislukt. Controleer je gegevens.");
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="name">Naam</Label>
        <Input id="name" name="name" defaultValue={name} required minLength={2} autoComplete="name" className="mt-1" />
      </div>
      <div>
        <Label htmlFor="phone">Telefoon (optioneel)</Label>
        <Input id="phone" name="phone" defaultValue={phone} type="tel" autoComplete="tel" className="mt-1" />
      </div>
      <div>
        <Label htmlFor="locale">Taal van e-mails</Label>
        <select id="locale" name="locale" defaultValue={locale} className="mt-1 flex h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm">
          <option value="nl">Nederlands</option>
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>
      <Button type="submit">Opslaan</Button>
      {msg && <p className="text-sm text-stone-700" role="status">{msg}</p>}
    </form>
  );
}

export function DeleteAccount() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (window.prompt("Typ VERWIJDER om je account definitief te anonimiseren") !== "VERWIJDER") return;
    setBusy(true);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "VERWIJDER" }),
    });
    setBusy(false);
    if (res.ok) {
      await signOut({ callbackUrl: "/" });
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(ERRORS[data.error] ?? "Verwijderen mislukt. Probeer het later opnieuw.");
  }
  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={remove} disabled={busy}>
        Account verwijderen
      </Button>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
    </div>
  );
}
