"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const START_DELAY_MS = 2000;
const MAX_DELAY_MS = 15_000;
const LONG_AFTER_MS = 30_000;
const GIVE_UP_AFTER_MS = 5 * 60_000;

type Phase = "waiting" | "long" | "gaveUp";

/**
 * Asks the server whether Stripe confirmed the payment. It backs off, says more after half a minute,
 * and stops after five minutes with a way to check again by hand.
 */
export function StatusPoller({ bookingId, token }: { bookingId: string; token: string }) {
  const t = useTranslations("ui.status");
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("waiting");
  const [round, setRound] = useState(0);

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;
    let delay = START_DELAY_MS;
    const startedAt = Date.now();
    setPhase("waiting");

    async function tick() {
      if (stopped) return;
      const elapsed = Date.now() - startedAt;
      if (elapsed > GIVE_UP_AFTER_MS) {
        setPhase("gaveUp");
        return;
      }
      if (elapsed > LONG_AFTER_MS) setPhase("long");
      // A hidden tab does not need to ask; it checks again as soon as it is visible.
      if (!document.hidden) {
        try {
          const res = await fetch(`/api/bookings/${bookingId}/status?t=${encodeURIComponent(token)}`, { cache: "no-store" });
          if (res.status === 404) {
            setPhase("gaveUp");
            return;
          }
          const data = await res.json().catch(() => ({}));
          if (data.status && data.status !== "PENDING") {
            router.replace(`/boeking/succes?bookingId=${encodeURIComponent(bookingId)}&t=${encodeURIComponent(token)}`);
            return;
          }
        } catch {
          /* offline for a moment: keep trying */
        }
      }
      delay = Math.min(MAX_DELAY_MS, Math.round(delay * 1.5));
      if (!stopped) timer = window.setTimeout(tick, delay);
    }
    void tick();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [bookingId, token, router, round]);

  const gaveUp = phase === "gaveUp";

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      {!gaveUp && (
        <span
          aria-hidden="true"
          className="mx-auto mb-6 block h-10 w-10 animate-spin rounded-full border-4 border-brand-soft border-t-brand motion-reduce:animate-none"
        />
      )}
      <h1 className="text-3xl text-ink">{t("title")}</h1>
      <div role="status" aria-live="polite">
        <p className="mt-3 text-stone-700">{gaveUp ? t("slow") : phase === "long" ? t("stillWaiting") : t("waiting")}</p>
        {gaveUp ? (
          <p className="mt-2 text-sm text-stone-600">{t("slowDetail")}</p>
        ) : (
          <p className="mt-2 text-sm text-stone-600">{t("hint")}</p>
        )}
      </div>
      {gaveUp && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={() => setRound((r) => r + 1)}>
            {t("checkAgain")}
          </Button>
          <Button asChild variant="outline">
            <Link href="/boekingen">{t("toBookings")}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
