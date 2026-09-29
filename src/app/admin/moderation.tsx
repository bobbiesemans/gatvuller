"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ReportActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function close(status: "RESOLVED" | "DISMISSED") {
    setBusy(true);
    await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setBusy(false);
    router.refresh();
  }
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" disabled={busy} onClick={() => close("RESOLVED")}>Afhandelen</Button>
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => close("DISMISSED")}>Afwijzen</Button>
    </div>
  );
}

export function ReviewVisibility({ id, hidden }: { id: string; hidden: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    await fetch("/api/admin/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, hidden: !hidden }),
    });
    setBusy(false);
    router.refresh();
  }
  return (
    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={toggle}>
      {hidden ? "Tonen" : "Verbergen"}
    </Button>
  );
}
