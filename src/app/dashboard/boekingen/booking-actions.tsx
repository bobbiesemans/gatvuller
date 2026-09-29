"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BookingActions({ bookingId, canNoShow, canRefund }: { bookingId: string; canNoShow: boolean; canRefund: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(path: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Mislukt");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {canNoShow && (
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => run("/api/bookings/no-show")}>
          No-show
        </Button>
      )}
      {canRefund && (
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => run("/api/bookings/cancel")}>
          Annuleer en betaal terug
        </Button>
      )}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
