import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { discountPercent, formatEuro } from "@/lib/money";
import { formatRange } from "@/lib/time";
import { isDemoMode, MIN_LEAD_MINUTES, PLATFORM_FEE_PERCENT } from "@/lib/config";
import { paymentsProvider } from "@/lib/stripe";
import { paymentModeFor } from "@/lib/marketplace";
import { ownerVisibility } from "@/lib/owner-visibility";
import { computeKpis, parsePeriod, periodStart } from "@/lib/kpi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { KpiBlock } from "@/components/dashboard/kpi-block";
import { PeriodSwitch } from "@/components/dashboard/period-switch";
import { VisibilityNote } from "@/components/dashboard/visibility-note";
import { requireOwner } from "./access";
import { CreateSlotForm } from "./create-slot-form";
import { SlotActions, type OfferSlot } from "./slot-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.dashboard");
  return { title: t("title"), description: t("meta.overview"), alternates: { canonical: "/dashboard" }, robots: { index: false } };
}

const ACTIVE = ["OPEN", "BOOKED", "PAUSED"] as const;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ periode?: string | string[] }> }) {
  const user = await requireOwner("/dashboard");
  const period = parsePeriod((await searchParams).periode);
  const t = await getTranslations("ui.dashboard");
  const locale = await getLocale();
  const now = new Date();

  const salons = await prisma.salon.findMany({
    where: user.role === "ADMIN" ? {} : { ownerId: user.id },
    include: { templates: { where: { active: true }, orderBy: { createdAt: "desc" }, take: 30 } },
    orderBy: { createdAt: "asc" },
    take: user.role === "ADMIN" ? 20 : undefined,
  });
  const ids = salons.map((s) => s.id);
  const slotInclude = { _count: { select: { bookings: { where: { status: { in: ["PAID", "NO_SHOW"] as ("PAID" | "NO_SHOW")[] } } } } } };

  const from = periodStart(period, now);
  const [activeSlots, pastSlots, kpiBookings, kpiSlots] = ids.length
    ? await Promise.all([
        prisma.slot.findMany({
          where: { salonId: { in: ids }, status: { in: [...ACTIVE] }, endsAt: { gt: now } },
          include: slotInclude,
          orderBy: { startsAt: "asc" },
          take: 100,
        }),
        prisma.slot.findMany({
          where: { salonId: { in: ids }, OR: [{ status: { notIn: [...ACTIVE] } }, { endsAt: { lte: now } }] },
          include: slotInclude,
          orderBy: { startsAt: "desc" },
          take: 15,
        }),
        prisma.booking.findMany({
          where: { status: { in: ["PAID", "NO_SHOW"] }, slot: { salonId: { in: ids }, ...(from ? { endsAt: { gte: from } } : {}) } },
          select: { slotId: true, amount: true, feeAmount: true, status: true, paymentMode: true, slot: { select: { startsAt: true, endsAt: true } } },
        }),
        prisma.slot.findMany({
          where: { salonId: { in: ids }, status: { not: "CANCELLED" }, endsAt: { lte: now, ...(from ? { gte: from } : {}) } },
          select: { id: true, salonId: true, capacity: true, endsAt: true, status: true },
        }),
      ])
    : [[], [], [], []];

  const liveBySalon = new Map(salons.map((s) => [s.id, paymentModeFor(s) === "LIVE"]));
  const { live, test } = computeKpis(
    kpiBookings.map((b) => ({ slotId: b.slotId, amount: b.amount, feeAmount: b.feeAmount, status: b.status, paymentMode: b.paymentMode, slotStartsAt: b.slot.startsAt, slotEndsAt: b.slot.endsAt })),
    kpiSlots.map((s) => ({ id: s.id, capacity: s.capacity, endsAt: s.endsAt, status: s.status, live: liveBySalon.get(s.salonId) ?? false })),
    period,
    now
  );

  const several = salons.length > 1;
  const provider = paymentsProvider();
  const setupNote = (salon: (typeof salons)[number]) => {
    if (salon.status === "PENDING") return t("salonNote.PENDING");
    if (salon.status === "SUSPENDED") return t("salonNote.SUSPENDED");
    if (!salon.isDemo && provider === "stripe" && !(salon.stripeAccountId && salon.stripeChargesEnabled)) return t("salonNote.payouts");
    return null;
  };

  const renderOffer = (slot: (typeof activeSlots)[number], salon: (typeof salons)[number]) => {
    const state = ownerVisibility(slot, salon, now);
    const active = (ACTIVE as readonly string[]).includes(slot.status) && slot.endsAt > now;
    const percent = discountPercent(slot.originalPrice, slot.discountPrice);
    const offer: OfferSlot = {
      id: slot.id,
      title: slot.title,
      description: slot.description,
      status: slot.status,
      capacity: slot.capacity,
      spotsLeft: slot.spotsLeft,
      originalPrice: slot.originalPrice,
      discountPrice: slot.discountPrice,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      active,
      withdrawable: slot.status !== "CANCELLED" && slot.status !== "EXPIRED" && slot.startsAt > now,
    };
    return (
      <li key={slot.id} className="space-y-3 py-4">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div>
            <p className="font-semibold text-ink">{slot.title}</p>
            <p className="text-sm text-stone-600">{formatRange(slot.startsAt, slot.endsAt, locale)}</p>
          </div>
          <p className="text-right text-sm">
            <span className="font-semibold text-ink">{formatEuro(slot.discountPrice, locale)}</span>{" "}
            <span className="text-stone-500 line-through">{formatEuro(slot.originalPrice, locale)}</span>
            <span className="block text-xs text-stone-600">{t("offer.discount", { percent })}</span>
          </p>
        </div>
        <p className="text-sm text-stone-600">
          {t("offer.spots", { free: slot.spotsLeft, total: slot.capacity })} · {t("offer.booked", { count: slot._count.bookings })}
        </p>
        <VisibilityNote state={state} leadMinutes={MIN_LEAD_MINUTES} />
        {(offer.active || offer.withdrawable) && <SlotActions slot={offer} />}
      </li>
    );
  };

  return (
    <div className="space-y-8 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl text-ink">{t("title")}</h1>
          <p className="mt-1 text-stone-600">{t("lead")}</p>
        </div>
        {salons.length > 0 && (
          <Link
            href="/dashboard/boekingen"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {t("checkin")}
          </Link>
        )}
      </div>

      {isDemoMode() && <Notice tone="warn">{t("demo")}</Notice>}

      {salons.length === 0 ? (
        <EmptyState
          title={t("none")}
          action={
            <Link href="/register" className="font-semibold text-brand underline underline-offset-4">
              {t("register")}
            </Link>
          }
        />
      ) : (
        <>
          {salons.map((salon) => {
            const note = setupNote(salon);
            if (!note) return null;
            return (
              <Notice key={salon.id} tone="warn">
                {several && <strong>{salon.name}: </strong>}
                {note}{" "}
                {salon.status === "ACTIVE" && (
                  <Link href="/dashboard/uitbetalingen" className="font-semibold underline underline-offset-2">
                    {t("salonNote.payoutsLink")}
                  </Link>
                )}
              </Notice>
            );
          })}

          <section aria-labelledby="kpi-title" className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="kpi-title" className="sr-only">
                  {t("revenue")}
                </h2>
                {several && <p className="text-sm text-stone-600">{t("scopeAll", { count: salons.length })}</p>}
              </div>
              <PeriodSwitch period={period} />
            </div>
            <KpiBlock title={t("live")} hint={t("kpi.liveHint")} kpi={live} feePercent={PLATFORM_FEE_PERCENT} />
            {(test.filledSpots > 0 || test.capacity > 0 || test.upcomingCount > 0) && (
              <KpiBlock title={t("test")} hint={t("kpi.testHint")} kpi={test} feePercent={PLATFORM_FEE_PERCENT} />
            )}
            <p className="text-sm text-stone-600">{t("feeNote", { percent: PLATFORM_FEE_PERCENT })}</p>
          </section>

          <Card id="publiceren">
            <CardHeader>
              <CardTitle>{t("publish")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateSlotForm
                salons={salons.map((s) => ({ id: s.id, name: s.name, status: s.status }))}
                templates={salons.flatMap((s) => s.templates.map((tpl) => ({ id: tpl.id, salonId: tpl.salonId, title: tpl.title, durationMin: tpl.durationMin, originalPrice: tpl.originalPrice, discountPrice: tpl.discountPrice })))}
                feePercent={PLATFORM_FEE_PERCENT}
                leadMinutes={MIN_LEAD_MINUTES}
              />
            </CardContent>
          </Card>

          {salons.map((salon) => {
            const current = activeSlots.filter((s) => s.salonId === salon.id);
            const past = pastSlots.filter((s) => s.salonId === salon.id);
            return (
              <section key={salon.id} aria-labelledby={`offers-${salon.id}`} className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h2 id={`offers-${salon.id}`} className="text-xl text-ink">
                    {several ? t("offer.for", { name: salon.name }) : t("offers")}
                  </h2>
                  <p className="text-sm text-stone-600">
                    {salon.city} · {t(`salonStatus.${salon.status}`)} ·{" "}
                    <Link href={`/salon/${salon.slug}`} className="underline underline-offset-2">
                      {t("publicPage")}
                    </Link>
                  </p>
                </div>
                <Card>
                  <CardContent className="p-5 pt-3">
                    {current.length === 0 ? (
                      <EmptyState className="border-0 py-8" title={t("noOffers")} body={t("offer.noOffersBody")} />
                    ) : (
                      <ul className="divide-y divide-stone-100">{current.map((slot) => renderOffer(slot, salon))}</ul>
                    )}
                    {past.length > 0 && (
                      <details className="mt-3 border-t border-stone-100 pt-2">
                        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-stone-700">
                          {t("offer.earlier", { count: past.length })}
                        </summary>
                        <ul className="divide-y divide-stone-100">{past.map((slot) => renderOffer(slot, salon))}</ul>
                      </details>
                    )}
                  </CardContent>
                </Card>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
