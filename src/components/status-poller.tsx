"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

const START_DELAY_MS = 2000;
const MAX_DELAY_MS = 15_000;
const GIVE_UP_AFTER_MS = 5 * 60_000;

/** Asks the server whether Stripe confirmed the payment. Backs off, and stops after five minutes. */
export function StatusPoller({ bookingId, token }: { bookingId: string; token: string }) {
  const t = useTranslations("ui.status");
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let stopped = false;
    let delay = START_DELAY_MS;
    const startedAt = Date.now();
    async function tick() {
      if (stopped) return;
      if (Date.now() - startedAt > GIVE_UP_AFTER_MS) {
        setGaveUp(true);
        return;
      }
      try {
        const res = await fetch(`/api/bookings/${bookingId}/status?t=${encodeURIComponent(token)}`, { cache: "no-store" });
        const data = await res.json();
        if (data.status && data.status !== "PENDING") {
          router.replace(`/boeking/succes?bookingId=${bookingId}&t=${encodeURIComponent(token)}`);
          return;
        }
      } catch {
        /* keep trying */
      }
      delay = Math.min(MAX_DELAY_MS, Math.round(delay * 1.5));
      if (!stopped) window.setTimeout(tick, delay);
    }
    void tick();
    return () => {
      stopped = true;
    };
  }, [bookingId, token, router]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center" role="status" aria-live="polite">
      {!gaveUp && (
        <span
          aria-hidden="true"
          className="mx-auto mb-6 block h-10 w-10 animate-spin rounded-full border-4 border-brand-soft border-t-brand motion-reduce:animate-none"
        />
      )}
      <h1 className="text-3xl text-ink">{t("title")}</h1>
      <p className="mt-3 text-stone-600">{gaveUp ? t("slow") : t("waiting")}</p>
      {!gaveUp && <p className="mt-2 text-sm text-stone-500">{t("hint")}</p>}
      {gaveUp && (
        <Link href="/boekingen" className="mt-6 inline-block font-semibold text-brand underline underline-offset-4">
          {t("toBookings")}
        </Link>
      )}
    </div>
  );
}
