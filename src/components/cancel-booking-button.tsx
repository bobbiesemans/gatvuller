"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useErrorText } from "@/lib/i18n/use-error-text";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (!window.confirm(t("confirm"))) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/bookings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(errorText(data.error));
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <Button type="button" size="sm" variant={variant} onClick={cancel} disabled={loading}>
        {loading ? t("loading") : t("button")}
      </Button>
      {error && (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
