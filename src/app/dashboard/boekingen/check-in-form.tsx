"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { useErrorText } from "@/lib/i18n/use-error-text";

/** `initialCode` comes from a scanned voucher QR; the owner still confirms with one tap. */
export function CheckInForm({ initialCode = "" }: { initialCode?: string }) {
  const t = useTranslations("ui.dashboard.bookings");
  const errorText = useErrorText();
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/bookings/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error === "not_found" ? t("notFound") : errorText(data.error));
        return;
      }
      setMessage(t(data.already ? "alreadyIn" : "checkedIn", { name: String(data.customerName ?? "") }));
      setCode("");
      router.refresh();
    } catch {
      setError(errorText("generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-brand-soft bg-brand-soft p-4">
      <p className="text-sm text-stone-700">{t("checkinHint")}</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-56 space-y-1">
          <Label htmlFor="checkin-code">{t("code")}</Label>
          <Input
            id="checkin-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="bg-white font-mono tracking-widest"
            required
            minLength={4}
            maxLength={16}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {t("checkInBtn")}
        </Button>
      </div>
      <div aria-live="polite">
        {message && <Notice>{message}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    </form>
  );
}
