"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { useErrorText } from "@/lib/i18n/use-error-text";

const REASONS = ["FAKE_OFFER", "WRONG_PRICE", "SALON_NO_SHOW", "INAPPROPRIATE", "OTHER"] as const;

/** Reports go to a moderation queue, so the confirmation promises a review, not an answer. */
export function ReportOffer({ slotId, salonId, target = "offer" }: { slotId?: string; salonId: string; target?: "offer" | "salon" }) {
  const t = useTranslations("ui.report");
  const common = useTranslations("ui.common");
  const errorText = useErrorText();
  const uid = useId();
  const busy = useRef(false);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const label = target === "salon" ? t("titleSalon") : t("title");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const fd = new FormData(event.currentTarget);
    const message = String(fd.get("message") || "").trim();
    if (reason === "OTHER" && message.length < 5) {
      setError(t("messageRequired"));
      return;
    }
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, salonId, reason, message: message || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errorText(data.error));
        return;
      }
      setSent(true);
    } catch {
      setError(errorText(null));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
        <p className="font-semibold text-ink">{t("sent")}</p>
        <p className="mt-1">{t("sentDetail")}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        className="inline-flex min-h-11 items-center text-sm text-stone-600 underline underline-offset-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        onClick={() => setOpen(true)}
        aria-expanded={false}
      >
        {label}
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4" aria-busy={loading}>
      <h2 className="font-sans text-base font-semibold tracking-normal text-ink">{label}</h2>
      <Field id={`${uid}-reason`} label={t("reason")}>
        <Select id={`${uid}-reason`} name="reason" required value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="" disabled>
            {t("choose")}
          </option>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {t(r)}
            </option>
          ))}
        </Select>
      </Field>
      <Field id={`${uid}-message`} label={reason === "OTHER" ? t("message") : t("messageOptional")} hint={t("messageHint")}>
        <textarea
          id={`${uid}-message`}
          name="message"
          maxLength={500}
          required={reason === "OTHER"}
          aria-describedby={`${uid}-message-hint`}
          className="min-h-24 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading || !reason}>
          {loading ? common("loading") : t("send")}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
