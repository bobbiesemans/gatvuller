"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function StatusPoller({ bookingId, token }: { bookingId: string; token: string }) {
  const t = useTranslations("ui.status");
  const router = useRouter();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let stopped = false;
    let attempts = 0;
    async function tick() {
      if (stopped) return;
      attempts += 1;
      if (attempts > 20) setSlow(true);
      try {
        const res = await fetch(`/api/bookings/${bookingId}/status?t=${encodeURIComponent(token)}`, { cache: "no-store" });
        const data = await res.json();
        if (data.status && data.status !== "PENDING") {
          router.replace(`/boeking/succes?bookingId=${bookingId}&t=${encodeURIComponent(token)}`);
          return;
        }
      } catch {
        /* keep polling */
      }
      if (!stopped) window.setTimeout(tick, 2000);
    }
    void tick();
    return () => {
      stopped = true;
    };
  }, [bookingId, token, router]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-3xl text-ink">{t("title")}</h1>
      <p className="mt-3 text-stone-600">{t("waiting")}</p>
      <p className="mt-2 text-sm text-stone-500">{t("hint")}</p>
      {slow && <p className="mt-6 text-sm text-stone-500">{t("hint")}</p>}
    </div>
  );
}
