"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useErrorText } from "@/lib/i18n/use-error-text";

type Action = "approve" | "suspend" | "reactivate";

/** Approve, suspend (with a reason the owner will read) or reactivate one business. The API checks the role and the allowed step. */
export function SalonReview({ salonId, salonName, status }: { salonId: string; salonName: string; status: string }) {
  const t = useTranslations("ui.admin");
  const errorText = useErrorText();
  const router = useRouter();
  const reasonId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");

  async function act(action: Action) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/salons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonId, action, reason: action === "suspend" ? reason.trim() : undefined }),
      });
      if (!res.ok) {
        setError(errorText((await res.json().catch(() => ({}))).error));
        setBusy(false);
        return;
      }
      setAsking(false);
      setReason("");
      router.refresh();
    } catch {
      setError(errorText("server_error"));
    }
    setBusy(false);
  }

  if (asking) {
    return (
      <form
        className="w-full space-y-2 sm:max-w-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (reason.trim()) act("suspend");
        }}
      >
        <label htmlFor={reasonId} className="block text-sm font-medium text-stone-800">
          {t("suspendReason")}
        </label>
        <textarea
          id={reasonId}
          required
          maxLength={300}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-describedby={`${reasonId}-hint`}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          autoFocus
        />
        <p id={`${reasonId}-hint`} className="text-xs text-stone-600">
          {t("suspendHint")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="danger" size="sm" className="min-h-11" disabled={busy || !reason.trim()} aria-label={t("suspendConfirm", { name: salonName })}>
            {t("suspend")}
          </Button>
          <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={busy} onClick={() => setAsking(false)}>
            {t("cancel")}
          </Button>
        </div>
        <div aria-live="polite">{error && <p className="text-sm text-red-700">{error}</p>}</div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "PENDING" && (
        <Button size="sm" className="min-h-11" disabled={busy} onClick={() => act("approve")} aria-label={t("approveFor", { name: salonName })}>
          {t("approve")}
        </Button>
      )}
      {status === "SUSPENDED" && (
        <Button size="sm" variant="outline" className="min-h-11" disabled={busy} onClick={() => act("reactivate")} aria-label={t("reactivateFor", { name: salonName })}>
          {t("reactivate")}
        </Button>
      )}
      {status !== "SUSPENDED" && (
        <Button size="sm" variant="outline" className="min-h-11" disabled={busy} onClick={() => setAsking(true)} aria-label={t("suspendFor", { name: salonName })}>
          {t("suspend")}
        </Button>
      )}
      <div aria-live="polite">{error && <span className="text-sm text-red-700">{error}</span>}</div>
    </div>
  );
}
