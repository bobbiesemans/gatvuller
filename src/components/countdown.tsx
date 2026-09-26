"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

function parts(msTarget: number) {
  const ms = Math.max(0, msTarget - Date.now());
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { ms, h, m, s };
}

export function Countdown({
  to,
  label = "Start over",
  className,
}: {
  to: string | Date;
  label?: string;
  className?: string;
}) {
  const targetMs = useMemo(
    () => (typeof to === "string" ? new Date(to) : to).getTime(),
    [to]
  );
  const [mounted, setMounted] = useState(false);
  const [t, setT] = useState(() => parts(targetMs));

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setT(parts(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  if (!mounted) {
    return <span className={cn("tabular-nums font-semibold text-slate-500", className)}>{label} …</span>;
  }

  if (t.ms <= 0) {
    return <span className={cn("text-amber-700 font-semibold", className)}>Nu starten</span>;
  }

  const urgent = t.ms < 2 * 60 * 60 * 1000;

  return (
    <span className={cn("tabular-nums font-semibold", urgent ? "text-rose-600" : "text-slate-700", className)}>
      {label}{" "}
      {t.h > 0 ? `${t.h}u ` : ""}
      {String(t.m).padStart(2, "0")}:{String(t.s).padStart(2, "0")}
    </span>
  );
}
