import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { KPI_PERIODS, type KpiPeriod } from "@/lib/kpi";
import { cn } from "@/lib/utils";

const KEY: Record<KpiPeriod, string> = { "7d": "d7", "30d": "d30", all: "all" };

/** 7 days / 30 days / all time, as plain links so the choice is part of the URL. */
export async function PeriodSwitch({ period }: { period: KpiPeriod }) {
  const t = await getTranslations("ui.dashboard.period");
  return (
    <nav aria-label={t("label")}>
      <ul className="inline-flex rounded-xl border border-stone-200 bg-white p-1">
        {KPI_PERIODS.map((p) => (
          <li key={p}>
            <Link
              href={`/dashboard?periode=${p}`}
              scroll={false}
              aria-current={p === period ? "true" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:px-4",
                p === period ? "bg-brand text-white" : "text-stone-700 hover:bg-stone-100"
              )}
            >
              {t(KEY[p])}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
