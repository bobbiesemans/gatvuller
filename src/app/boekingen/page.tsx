import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarPlus, Clock, MapPin } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { REVIEW_WINDOW_DAYS } from "@/lib/config";
import { formatEuro } from "@/lib/money";
import { shortCode } from "@/lib/utils";
import { formatInZone } from "@/lib/time";
import { reviewEligibility } from "@/lib/bookings";
import { toLocale } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { StatusPill } from "@/components/ui/status-pill";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { ReviewForm } from "@/components/review-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.bookings");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
    alternates: { canonical: "/boekingen" },
  };
}

const KNOWN = ["PAID", "PENDING", "CANCELLED", "REFUNDED", "EXPIRED", "NO_SHOW"] as const;

export default async function BoekingenPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login?callbackUrl=/boekingen");
  const [t, r, common, locale, sp] = await Promise.all([
    getTranslations("ui.bookings"),
    getTranslations("ui.review"),
    getTranslations("ui.common"),
    getLocale(),
    searchParams,
  ]);
  const lc = toLocale(locale);
  const tab = sp.tab === "voorbij" || sp.tab === "past" ? "past" : "upcoming";

  const bookings = await prisma.booking.findMany({
    where: { customerId: me.id },
    include: { slot: { include: { salon: true } }, review: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const now = new Date();
  // A hold that ran out is an expired booking, whatever the row still says.
  const effective = (b: (typeof bookings)[number]) =>
    b.status === "PENDING" && b.holdExpiresAt && b.holdExpiresAt < now ? "EXPIRED" : b.status;
  const upcoming = bookings
    .filter((b) => b.slot.endsAt > now && (effective(b) === "PAID" || effective(b) === "PENDING"))
    .sort((a, b) => a.slot.startsAt.getTime() - b.slot.startsAt.getTime());
  const past = bookings
    .filter((b) => !upcoming.includes(b))
    .sort((a, b) => b.slot.startsAt.getTime() - a.slot.startsAt.getTime());
  const shown = tab === "past" ? past : upcoming;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl text-ink">{t("title")}</h1>
        <p className="mt-1 text-stone-600">{t("lead")}</p>
      </div>
      <nav aria-label={t("tabsLabel")} className="flex gap-2">
        <Button asChild variant={tab === "upcoming" ? "default" : "outline"}>
          <Link href="/boekingen" aria-current={tab === "upcoming" ? "page" : undefined}>
            {t("upcoming")} ({upcoming.length})
          </Link>
        </Button>
        <Button asChild variant={tab === "past" ? "default" : "outline"}>
          <Link href="/boekingen?tab=voorbij" aria-current={tab === "past" ? "page" : undefined}>
            {t("past")} ({past.length})
          </Link>
        </Button>
      </nav>

      {shown.length === 0 ? (
        <EmptyState
          title={tab === "past" ? t("emptyPastTitle") : t("emptyTitle")}
          body={tab === "past" ? t("emptyPastBody") : t("emptyBody")}
          action={
            <Button asChild>
              <Link href="/slots">{t("cta")}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-4">
          {shown.map((b) => {
            const status = effective(b);
            const code = shortCode(b.confirmationCode);
            const hours = b.cancellationHours ?? b.slot.salon.cancellationHours;
            const deadline = new Date(b.slot.startsAt.getTime() - hours * 3_600_000);
            const cancelOpen = status === "PAID" && deadline > now;
            const label = (KNOWN as readonly string[]).includes(status) ? t(status as (typeof KNOWN)[number]) : status;
            const review = b.review;
            const canReview = !review && reviewEligibility(b, now) === "ok";
            return (
              <li key={b.id}>
                <Card className="overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-brand px-5 py-3 text-white">
                    {status === "PAID" ? (
                      <div>
                        <p className="text-xs text-brand-soft">{t("confirmation")}</p>
                        <p className="font-mono text-xl font-bold tracking-[0.15em]">{code}</p>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold">{b.slot.salon.name}</p>
                    )}
                    <StatusPill status={status} label={label} />
                  </div>
                  <CardContent className="space-y-2 p-5 text-sm text-stone-700">
                    <h2 className="text-lg text-ink">{b.slot.title}</h2>
                    <p>
                      <Link href={`/salon/${b.slot.salon.slug}`} className="font-semibold text-ink underline underline-offset-4">
                        {b.slot.salon.name}
                      </Link>
                      {b.slot.salon.isDemo && <span className="text-stone-500"> · {common("demo")}</span>}
                    </p>
                    <p className="flex items-start gap-2">
                      <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      {b.slot.salon.address}
                    </p>
                    <p className="flex items-start gap-2">
                      <Clock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      {formatInZone(b.slot.startsAt, lc, "dayMonth")} · {formatInZone(b.slot.startsAt, lc, "time")}–{formatInZone(b.slot.endsAt, lc, "time")}
                    </p>
                    <p className="pt-1 text-xl font-semibold text-brand">{formatEuro(b.amount, lc)}</p>

                    {status === "PENDING" && <Notice tone="warn">{t("pendingNote")}</Notice>}
                    {status === "EXPIRED" && <p className="text-stone-600">{t("expiredNote")}</p>}
                    {status === "NO_SHOW" && <p className="text-stone-600">{t("noShowNote")}</p>}
                    {(status === "REFUNDED" || (status === "CANCELLED" && (b.refundAmount ?? 0) > 0)) && (
                      <p className="text-stone-600">{t("refundedNote", { amount: formatEuro(b.refundAmount ?? b.amount, lc) })}</p>
                    )}
                    {status === "PAID" && b.slot.endsAt > now && (
                      <p className="text-stone-600">
                        {cancelOpen
                          ? t("cancelUntil", { deadline: formatInZone(deadline, lc, "dayTime") })
                          : t("cancelClosed")}
                      </p>
                    )}

                    <div className="flex flex-wrap items-start gap-2 pt-2">
                      <Button asChild variant={status === "PAID" && tab === "upcoming" ? "default" : "outline"}>
                        <Link href={`/boekingen/${b.id}`}>{t("voucher")}</Link>
                      </Button>
                      {status === "PAID" && b.slot.endsAt > now && (
                        <Button asChild variant="outline">
                          <a href={`/api/bookings/${b.id}/ics`}>
                            <CalendarPlus aria-hidden="true" className="h-4 w-4" />
                            {t("calendar")}
                          </a>
                        </Button>
                      )}
                      {cancelOpen && <CancelBookingButton bookingId={b.id} />}
                    </div>

                    {canReview && (
                      <div className="pt-3">
                        <ReviewForm bookingId={b.id} verified={Boolean(b.checkedInAt)} windowDays={REVIEW_WINDOW_DAYS} />
                      </div>
                    )}
                    {review && (
                      <div className="pt-3">
                        <p className="font-semibold text-ink">{r("score", { rating: review.rating })}</p>
                        {review.hidden && <Notice tone="warn">{r("hiddenNote")}</Notice>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
