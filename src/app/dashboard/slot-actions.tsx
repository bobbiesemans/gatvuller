"use client";

import { useErrorText } from "@/lib/i18n/use-error-text";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SlotActions({ slotId, status }: { slotId: string; status: string }) {
  const errorText = useErrorText();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "pause" | "resume" | "delete") {
    // Withdrawing refunds everyone who paid: never on a single accidental tap.
    if (kind === "delete" && !window.confirm("Aanbod intrekken? Klanten die al betaalden krijgen hun geld volledig terug.")) return;
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
      setError(errorText(data.error));
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
          {loading === "delete" ? "…" : "Intrekken"}
        </Button>
      )}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
