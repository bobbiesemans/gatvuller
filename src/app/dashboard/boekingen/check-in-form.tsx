"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** `initialCode` comes from a scanned voucher QR; the owner still confirms with one tap. */
export function CheckInForm({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/bookings/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error === "not_found" ? "Code niet gevonden" : data.error || "Mislukt");
      return;
    }
    setMessage(`${data.customerName} is afgevinkt.`);
    setCode("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2 rounded-2xl border border-[#f8ebe5] bg-[#f8ebe5] p-4">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Bevestigingscode"
        className="max-w-xs bg-white font-mono tracking-widest"
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Bezig…" : "Afvinken"}
      </Button>
      {message && <p className="w-full text-sm font-medium text-emerald-700">{message}</p>}
      {error && <p className="w-full text-sm text-rose-600">{error}</p>}
    </form>
  );
}
