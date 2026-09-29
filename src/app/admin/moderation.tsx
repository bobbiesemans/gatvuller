"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useErrorText } from "@/lib/i18n/use-error-text";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.ok ? null : ((await res.json().catch(() => ({}))).error as string | undefined) ?? "generic";
}

export function ReportActions({ id, context }: { id: string; context: string }) {
  const t = useTranslations("ui.admin");
  const errorText = useErrorText();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function close(status: "RESOLVED" | "DISMISSED") {
    setBusy(true);
    setError(null);
    try {
      const code = await post("/api/admin/reports", { id, status });
      if (code) setError(errorText(code));
      else router.refresh();
    } catch {
      setError(errorText("server_error"));
    }
    setBusy(false);
  }
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" className="min-h-11" disabled={busy} onClick={() => close("RESOLVED")} aria-label={`${t("resolve")}: ${context}`}>
          {t("resolve")}
        </Button>
        <Button type="button" size="sm" variant="outline" className="min-h-11" disabled={busy} onClick={() => close("DISMISSED")} aria-label={`${t("dismiss")}: ${context}`}>
          {t("dismiss")}
        </Button>
      </div>
      <div aria-live="polite">{error && <p className="text-sm text-red-700">{error}</p>}</div>
    </div>
  );
}

export function ReviewVisibility({ id, hidden, context }: { id: string; hidden: boolean; context: string }) {
  const t = useTranslations("ui.admin");
  const errorText = useErrorText();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const code = await post("/api/admin/reviews", { id, hidden: !hidden });
      if (code) setError(errorText(code));
      else router.refresh();
    } catch {
      setError(errorText("server_error"));
    }
    setBusy(false);
  }
  return (
    <div className="space-y-1">
      <Button type="button" size="sm" variant="outline" className="min-h-11" disabled={busy} onClick={toggle} aria-label={`${hidden ? t("show") : t("hide")}: ${context}`}>
        {hidden ? t("show") : t("hide")}
      </Button>
      <div aria-live="polite">{error && <p className="text-sm text-red-700">{error}</p>}</div>
    </div>
  );
}
