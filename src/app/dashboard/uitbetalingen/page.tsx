import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { stripeConfigured, stripeMode } from "@/lib/stripe";
import { PLATFORM_FEE_PERCENT } from "@/lib/config";
import { payoutOverview, retrieveConnectState, type ConnectState, type PayoutOverview } from "@/lib/payments";
import { payoutHealth, requirementGroups, type PayoutHealth } from "@/lib/connect-requirements";
import { formatEuro } from "@/lib/money";
import { formatInZone } from "@/lib/time";
import { log } from "@/lib/log";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { requireOwner } from "../access";
import { PayoutButton } from "../salon-tools";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.dashboard");
  return { title: t("payouts"), description: t("meta.payouts"), alternates: { canonical: "/dashboard/uitbetalingen" }, robots: { index: false } };
}

const PAYOUT_STATUS = ["paid", "pending", "in_transit", "canceled", "failed"];
const HEALTH_TONE: Record<PayoutHealth, string> = {
  active: "bg-emerald-100 text-emerald-800",
  payoutsOff: "bg-amber-100 text-amber-900",
  incomplete: "bg-amber-100 text-amber-900",
  restricted: "bg-red-100 text-red-800",
};

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<{ zaak?: string }> }) {
  const user = await requireOwner("/dashboard/uitbetalingen");
  const { zaak } = await searchParams;
  const t = await getTranslations("ui.dashboard");
  const locale = await getLocale();
  const salons = await prisma.salon.findMany({
    where: user.role === "ADMIN" ? (zaak ? { id: zaak } : { id: "__none__" }) : { ownerId: user.id },
    orderBy: { name: "asc" },
  });
  const configured = stripeConfigured();

  const rows = await Promise.all(
    salons.map(async (salon) => {
      let state: ConnectState | null = null;
      let payouts: PayoutOverview | null = null;
      if (configured && salon.stripeAccountId) {
        try {
          state = await retrieveConnectState(salon.stripeAccountId);
          await prisma.salon.update({
            where: { id: salon.id },
            data: { stripeChargesEnabled: state.chargesEnabled, stripePayoutsEnabled: state.payoutsEnabled, stripeDetailsSubmitted: state.detailsSubmitted },
          });
          if (state.payoutsEnabled) payouts = await payoutOverview(salon.stripeAccountId);
        } catch (error) {
          log.warn("payouts.load_failed", { salonId: salon.id, error });
        }
      }
      return { salon, state, payouts };
    })
  );

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl text-ink">{t("payouts")}</h1>
        <p className="mt-1 max-w-2xl text-stone-600">{t("pay.lead", { percent: PLATFORM_FEE_PERCENT })}</p>
      </div>
      {!configured && <Notice tone="warn">{t("pay.noStripe")}</Notice>}
      {configured && stripeMode() === "test" && <Notice tone="warn">{t("pay.testMode")}</Notice>}

      {rows.length === 0 && (
        <EmptyState
          title={t("pay.noSalon")}
          action={
            <Link href="/register" className="font-semibold text-brand underline underline-offset-4">
              {t("register")}
            </Link>
          }
        />
      )}

      {rows.map(({ salon, state, payouts }) => {
        const health = state ? payoutHealth(state) : null;
        const groups = state ? requirementGroups(state.requirementsDue) : [];
        return (
          <Card key={salon.id}>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{salon.name}</CardTitle>
              {health && (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${HEALTH_TONE[health]}`}>{t(`pay.state.${health}.label`)}</span>
              )}
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-stone-700">
              {salon.isDemo ? (
                <p>{t("pay.demo")}</p>
              ) : !salon.stripeAccountId ? (
                <p>{t("pay.noAccount")}</p>
              ) : state && health ? (
                <>
                  <p>{t(`pay.state.${health}.text`)}</p>
                  {groups.length > 0 && health !== "active" && (
                    <div>
                      <p className="font-medium text-ink">{t("pay.needs")}</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {groups.map((group) => (
                          <li key={group}>{t(`pay.req.${group}`)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <Notice tone="warn">{t("pay.loadFailed")}</Notice>
              )}

              {payouts && (
                <div className="space-y-3 rounded-xl bg-paper p-4">
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-ink">{t("pay.available")}</dt>
                      <dd className="font-display text-2xl text-ink">{formatEuro(payouts.available, locale)}</dd>
                      <dd className="text-xs text-stone-600">{t("pay.availableHint")}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink">{t("pay.pending")}</dt>
                      <dd className="font-display text-2xl text-ink">{formatEuro(payouts.pending, locale)}</dd>
                      <dd className="text-xs text-stone-600">{t("pay.pendingHint")}</dd>
                    </div>
                  </dl>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{t("pay.recent")}</h3>
                    {payouts.payouts.length === 0 ? (
                      <p className="mt-1 text-stone-600">{t("pay.none")}</p>
                    ) : (
                      <ul className="mt-1 divide-y divide-stone-200">
                        {payouts.payouts.map((p) => (
                          <li key={p.id} className="flex flex-wrap justify-between gap-x-4 py-2">
                            <span>{formatInZone(p.arrivalDate, locale, "date")}</span>
                            <span className="font-medium text-ink">{formatEuro(p.amount, locale)}</span>
                            <span className="text-stone-600">{t(`pay.status.${PAYOUT_STATUS.includes(p.status) ? p.status : "other"}`)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {!salon.isDemo && (
                <div className="flex flex-wrap items-start gap-3">
                  {!salon.stripeAccountId ? (
                    <PayoutButton salonId={salon.id} configured={configured} action="onboard" label={t("pay.connect")} primary />
                  ) : (
                    <>
                      {health && health !== "active" && <PayoutButton salonId={salon.id} configured={configured} action="onboard" label={t("pay.continue")} primary />}
                      {state?.detailsSubmitted && <PayoutButton salonId={salon.id} configured={configured} action="dashboard" label={t("pay.open")} primary={health === "active"} />}
                    </>
                  )}
                </div>
              )}
              {!salon.isDemo && !configured && <p className="text-xs text-stone-600">{t("pay.unavailable")}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
