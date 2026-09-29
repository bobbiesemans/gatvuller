"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const GOOD = new Set(["visible"]);
const NEUTRAL = new Set(["full", "ended", "withdrawn", "paused", "closing"]);

/** Is this offer on the public site, and if not, why not and what to do. `state` comes from slotVisibility on the server. */
export function VisibilityNote({ state, leadMinutes, className }: { state: string; leadMinutes: number; className?: string }) {
  const t = useTranslations("ui.dashboard");
  const tone = GOOD.has(state) ? "good" : NEUTRAL.has(state) ? "neutral" : "warn";
  return (
    <div className={cn("space-y-1", className)}>
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
          tone === "good" && "bg-emerald-100 text-emerald-800",
          tone === "neutral" && "bg-stone-200 text-stone-700",
          tone === "warn" && "bg-amber-100 text-amber-900"
        )}
      >
        {t(`visibility.${state}.label`)}
      </span>
      <p className="text-sm text-stone-600">
        {t(`visibility.${state}.reason`, { minutes: leadMinutes })}
        {state === "payouts_missing" && (
          <>
            {" "}
            <Link href="/dashboard/uitbetalingen" className="font-semibold text-brand underline underline-offset-2">
              {t("salonNote.payoutsLink")}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
