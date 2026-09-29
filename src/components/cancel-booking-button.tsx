"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useErrorText } from "@/lib/i18n/use-error-text";

/**
 * Two steps instead of a browser dialog: the first click explains the refund, the second one cancels.
 * The server decides whether the booking can still be cancelled; this only asks.
 */
export function CancelBookingButton({
  bookingId,
  variant = "outline",
}: {
  bookingId: string;
  variant?: "outline" | "danger" | "ghost";
}) {
  const t = useTranslations("ui.cancelBooking");
  const errorText = useErrorText();
  const router = useRouter();
  const busy = useRef(false);
  const [asking, setAsking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errorText(data.error));
        setAsking(false);
        return;
      }
      router.refresh();
    } catch {
      setError(errorText(null));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  if (asking) {
    return (
      <div role="group" aria-label={t("button")} className="w-full space-y-3 rounded-xl border border-stone-200 bg-paper p-4 text-sm text-stone-700">
        <p>{t("confirm")}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="danger" onClick={cancel} disabled={loading}>
            {loading ? t("loading") : t("confirmYes")}
          </Button>
          <Button type="button" variant="outline" onClick={() => setAsking(false)} disabled={loading}>
            {t("confirmNo")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant={variant} onClick={() => setAsking(true)}>
        {t("button")}
      </Button>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
