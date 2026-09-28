"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SalonReview({ salonId, status }: { salonId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "suspend" | "reactivate") {
    let reason: string | undefined;
    if (action === "suspend") {
      reason = window.prompt("Reden van schorsing (zichtbaar in de auditlog)") || undefined;
      if (!reason) return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/salons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salonId, action, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Actie mislukt");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "PENDING" && <Button size="sm" disabled={busy} onClick={() => act("approve")}>Goedkeuren</Button>}
      {status === "SUSPENDED" && <Button size="sm" variant="outline" disabled={busy} onClick={() => act("reactivate")}>Heractiveren</Button>}
      {status !== "SUSPENDED" && <Button size="sm" variant="outline" disabled={busy} onClick={() => act("suspend")}>Schorsen</Button>}
      {error && <span className="text-xs text-red-700" role="alert">{error}</span>}
    </div>
  );
}
