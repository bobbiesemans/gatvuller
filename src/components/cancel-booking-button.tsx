"use client";

import { useErrorText } from "@/lib/i18n/use-error-text";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CancelBookingButton({
  bookingId,
  variant = "outline",
}: {
  bookingId: string;
  variant?: "outline" | "danger" | "ghost";
}) {
  const errorText = useErrorText();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (!confirm("Boeking annuleren? Het last-minute afspraak komt weer vrij voor anderen.")) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/bookings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(errorText(data.error));
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <Button type="button" size="sm" variant={variant} onClick={cancel} disabled={loading}>
        {loading ? "Annuleren…" : "Annuleren"}
      </Button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
