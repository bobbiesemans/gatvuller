"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const REASONS = ["FAKE_OFFER", "WRONG_PRICE", "SALON_NO_SHOW", "INAPPROPRIATE", "OTHER"] as const;

export function ReportOffer({ slotId, salonId }: { slotId: string; salonId: string }) {
  const t = useTranslations("ui.report");
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slotId,
        salonId,
        reason: fd.get("reason"),
        message: fd.get("message"),
      }),
    });
    if (!res.ok) {
      setError(t("title"));
      return;
    }
    setSent(true);
  }

  if (!open) {
    return (
      <button type="button" className="text-sm text-stone-500 underline underline-offset-2" onClick={() => setOpen(true)}>
        {t("title")}
      </button>
    );
  }
  if (sent) return <p className="text-sm text-stone-600">{t("sent")}</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
      <p className="font-semibold text-ink">{t("title")}</p>
      <div>
        <Label htmlFor="reason">{t("reason")}</Label>
        <Select id="reason" name="reason" required className="mt-1" aria-label={t("reason")}>
          {REASONS.map((reason) => (
            <option key={reason} value={reason}>{t(reason)}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="report-message">{t("message")}</Label>
        <textarea
          id="report-message"
          name="message"
          maxLength={500}
          className="mt-1 min-h-20 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
        />
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" size="sm">{t("send")}</Button>
    </form>
  );
}
