"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ContactForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        topic: fd.get("topic"),
        message: fd.get("message"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error || "Versturen mislukt. Mail ons rechtstreeks.");
      return;
    }
    setMessage(data.delivered ? "Verstuurd. We antwoorden op het opgegeven adres." : "Ontvangen in de test-outbox. Er is nog geen e-mailprovider ingesteld, dus mail ook rechtstreeks.");
    (e.target as HTMLFormElement).reset();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <div>
        <Label htmlFor="name">Naam</Label>
        <Input id="name" name="name" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" className="mt-1" />
      </div>
      <div>
        <Label htmlFor="topic">Onderwerp</Label>
        <select id="topic" name="topic" className="mt-1 flex h-11 w-full rounded-xl border border-stone-200 px-3 text-sm">
          <option value="boeking">Boeking</option>
          <option value="zaak">Mijn zaak</option>
          <option value="privacy">Privacy</option>
          <option value="anders">Iets anders</option>
        </select>
      </div>
      <div>
        <Label htmlFor="message">Bericht</Label>
        <textarea id="message" name="message" required minLength={10} maxLength={2000} className="mt-1 min-h-32 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" />
      </div>
      {message && <p className="text-sm text-stone-700" role="status">{message}</p>}
      <Button type="submit" disabled={loading}>{loading ? "Versturen…" : "Verstuur"}</Button>
    </form>
  );
}
