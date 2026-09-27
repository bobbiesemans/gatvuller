"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SlotActions({ slotId, status }: { slotId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "pause" | "resume" | "delete") {
    setLoading(kind);
    setError(null);
    const res =
      kind === "delete"
        ? await fetch(`/api/slots?id=${encodeURIComponent(slotId)}`, { method: "DELETE" })
        : await fetch("/api/slots", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: slotId, action: kind }),
          });
    setLoading(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Mislukt");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "OPEN" && (
        <Button type="button" size="sm" variant="outline" disabled={loading !== null} onClick={() => run("pause")}>
          {loading === "pause" ? "…" : "Pauzeren"}
        </Button>
      )}
      {status === "PAUSED" && (
        <Button type="button" size="sm" variant="outline" disabled={loading !== null} onClick={() => run("resume")}>
          {loading === "resume" ? "…" : "Hervatten"}
        </Button>
      )}
      {status !== "CANCELLED" && (
        <Button type="button" size="sm" variant="ghost" disabled={loading !== null} onClick={() => run("delete")}>
          {loading === "delete" ? "…" : "Verwijderen"}
        </Button>
      )}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
