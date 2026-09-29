"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Plain "starts in ..." for an offer. No ticking seconds and no pressure: it updates every 30 seconds.
 * The server hands over its own clock so the first client render matches the server HTML.
 */
export function StartsIn({ to, now, className }: { to: string; now: number; className?: string }) {
  const t = useTranslations("ui.offer");
  const book = useTranslations("ui.book");
  const [current, setCurrent] = useState(now);

  useEffect(() => {
    setCurrent(Date.now());
    const id = window.setInterval(() => setCurrent(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const minutesTotal = Math.floor((new Date(to).getTime() - current) / 60_000);
  if (minutesTotal <= 0) return <span className={cn("font-semibold text-stone-800", className)}>{t("started")}</span>;

  const days = Math.floor(minutesTotal / 1440);
  const hours = Math.floor((minutesTotal % 1440) / 60);
  const minutes = minutesTotal % 60;
  const value =
    days > 0
      ? t("inDaysHours", { days, hours })
      : hours > 0
        ? t("inHoursMinutes", { hours, minutes })
        : t("inMinutes", { minutes });

  return (
    <span className={cn("tabular-nums font-semibold text-stone-800", className)}>
      {book("startIn")} {value}
    </span>
  );
}
