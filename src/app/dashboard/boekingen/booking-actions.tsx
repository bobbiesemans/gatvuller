"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { InlineConfirm } from "@/components/dashboard/inline-confirm";
import { useErrorText } from "@/lib/i18n/use-error-text";

type Kind = "checkin" | "noshow" | "cancel";

export function BookingActions({
  bookingId,
  code,
  name,
  amountLabel,
  canCheckIn,
  canNoShow,
  canRefund,
}: {
  bookingId: string;
  code: string;
  name: string;
  amountLabel: string;
  canCheckIn: boolean;
  canNoShow: boolean;
  canRefund: boolean;
}) {
  const t = useTranslations("ui.dashboard");
  const errorText = useErrorText();
  const router = useRouter();
  const [confirming, setConfirming] = useState<Kind | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  async function run(kind: Kind) {
    setBusy(true);
    setMessage(null);
    try {
      const res =
        kind === "checkin"
          ? await fetch("/api/bookings/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) })
          : await fetch(kind === "noshow" ? "/api/bookings/no-show" : "/api/bookings/cancel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookingId }),
            });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: "error", text: errorText(data.error) });
        return;
      }
      setConfirming(null);
      const text =
        kind === "checkin"
          ? t(data.already ? "bookings.alreadyIn" : "bookings.checkedIn", { name })
          : kind === "noshow"
            ? t("bookings.noShowDone")
            : t("bookings.cancelDone", { name });
      setMessage({ tone: "info", text });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: errorText("generic") });
    } finally {
      setBusy(false);
    }
  }

  const hasActions = canCheckIn || canNoShow || canRefund;
  return (
    <div className="mt-3 space-y-2">
      {hasActions && !confirming && (
        <div className="flex flex-wrap gap-2">
          {canCheckIn && (
            <Button type="button" size="sm" variant="outline" className="min-h-11" disabled={busy} onClick={() => run("checkin")}>
              {t("bookings.checkInRow")}
            </Button>
          )}
          {canNoShow && (
            <Button type="button" size="sm" variant="outline" className="min-h-11" disabled={busy} onClick={() => setConfirming("noshow")}>
              {t("noShow")}
            </Button>
          )}
          {canRefund && (
            <Button type="button" size="sm" variant="outline" className="min-h-11" disabled={busy} onClick={() => setConfirming("cancel")}>
              {t("refund")}
            </Button>
          )}
        </div>
      )}
      {confirming === "cancel" && (
        <InlineConfirm
          message={t("bookings.cancelConfirm", { name, amount: amountLabel })}
          yes={t("bookings.cancelYes")}
          no={t("bookings.keep")}
          busy={busy}
          onYes={() => run("cancel")}
          onNo={() => setConfirming(null)}
        />
      )}
      {confirming === "noshow" && (
        <InlineConfirm
          message={t("bookings.noShowConfirm", { name })}
          yes={t("bookings.noShowYes")}
          no={t("bookings.keep")}
          busy={busy}
          onYes={() => run("noshow")}
          onNo={() => setConfirming(null)}
        />
      )}
      <div aria-live="polite">{message && <Notice tone={message.tone}>{message.text}</Notice>}</div>
    </div>
  );
}
