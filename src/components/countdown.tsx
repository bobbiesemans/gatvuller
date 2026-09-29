"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Minutes, not ticking seconds: the time is informative, not a pressure tactic. */
function parts(msTarget: number) {
  const ms = Math.max(0, msTarget - Date.now());
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return { ms, h, m };
}

export function Countdown({
  to,
  label,
  className,
}: {
  to: string | Date;
  /** Text before the time. Defaults to "Starts in". */
  label?: string;
  className?: string;
}) {
  const t = useTranslations("ui.card");
  const targetMs = useMemo(() => (typeof to === "string" ? new Date(to) : to).getTime(), [to]);
  const [mounted, setMounted] = useState(false);
  const [left, setLeft] = useState(() => parts(targetMs));
  const lead = label ?? t("startsIn");

  useEffect(() => {
    setMounted(true);
    setLeft(parts(targetMs));
    const id = setInterval(() => setLeft(parts(targetMs)), 30_000);
    return () => clearInterval(id);
  }, [targetMs]);

  if (!mounted) {
    return <span className={cn("tabular-nums font-semibold text-stone-600", className)}>{lead} …</span>;
  }

  if (left.ms <= 0) {
    return <span className={cn("font-semibold text-stone-800", className)}>{t("started")}</span>;
  }

  return (
    <span className={cn("tabular-nums font-semibold text-stone-700", className)}>
      {lead} {left.h > 0 ? `${left.h} ${t("hourUnit")} ` : ""}
      {left.m} {t("minuteUnit")}
    </span>
  );
}
