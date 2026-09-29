import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatEuro, formatNumber } from "@/lib/money";
import { hasActivity, type Kpi } from "@/lib/kpi";

/** One block of figures for one payment kind (live, or test and demo), each with a one-line explanation. */
export async function KpiBlock({
  title,
  hint,
  kpi,
  feePercent,
}: {
  title: string;
  hint: string;
  kpi: Kpi;
  feePercent: number;
}) {
  const t = await getTranslations("ui.dashboard");
  const locale = await getLocale();
  const cards: { label: string; value: string; hint: string }[] = [
    { label: t("revenue"), value: formatEuro(kpi.revenue, locale), hint: t("kpi.revenueHint") },
    { label: t("net"), value: formatEuro(kpi.net, locale), hint: `${t("kpi.netHint")} (${formatNumber(feePercent, locale)}%)` },
    { label: t("kpi.filled"), value: formatNumber(kpi.filledSpots, locale), hint: t("kpi.filledHint") },
    { label: t("hours"), value: t("kpi.hoursValue", { value: formatNumber(kpi.hoursSaved, locale, 1) }), hint: t("kpi.hoursHint") },
    {
      label: t("occupancy"),
      value: kpi.occupancy === null ? "–" : `${formatNumber(kpi.occupancy, locale)}%`,
      hint: kpi.occupancy === null ? t("kpi.occupancyNone") : t("kpi.occupancyHint"),
    },
    { label: t("kpi.noShows"), value: formatNumber(kpi.noShows, locale), hint: t("kpi.noShowsHint") },
  ];
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg text-ink">{title}</h2>
        <p className="text-sm text-stone-600">{hint}</p>
      </div>
      {!hasActivity(kpi) ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-6 text-center text-sm text-stone-600">{t("kpi.empty")}</p>
      ) : (
        <>
          <dl className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <Card key={card.label}>
                <CardContent className="p-4">
                  <dt className="text-sm font-medium text-stone-700">{card.label}</dt>
                  <dd className="mt-1 font-display text-2xl text-ink">{card.value}</dd>
                  <dd className="mt-1 text-xs text-stone-600">{card.hint}</dd>
                </CardContent>
              </Card>
            ))}
          </dl>
          <p className="text-sm text-stone-600">{t("kpi.upcoming", { count: kpi.upcomingCount, amount: formatEuro(kpi.upcomingAmount, locale) })}</p>
        </>
      )}
    </section>
  );
}
