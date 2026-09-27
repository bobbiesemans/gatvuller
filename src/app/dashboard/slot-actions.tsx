"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CancelSlotButton({ slotId }: { slotId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!confirm("Dit open slot offline halen?")) return;
    setLoading(true);
    const res = await fetch(`/api/slots?id=${encodeURIComponent(slotId)}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Mislukt");
      return;
    }
    router.refresh();
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={run} disabled={loading}>
      {loading ? "…" : "Offline"}
    </Button>
  );
}
