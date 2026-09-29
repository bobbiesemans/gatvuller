import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/money";
import { formatRange } from "@/lib/time";
import { NO_SHOW_GRACE_MINUTES } from "@/lib/config";
import { groupBookings } from "@/lib/booking-groups";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { requireOwner } from "../access";
import { BookingActions } from "./booking-actions";
import { CheckInForm } from "./check-in-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.dashboard");
  return { title: t("bookingsTitle"), description: t("meta.bookings"), alternates: { canonical: "/dashboard/boekingen" }, robots: { index: false } };
}

const EARLIER_LIMIT = 40;
const CHECKIN_BEFORE_MS = 24 * 3_600_000;
const CHECKIN_AFTER_MS = 48 * 3_600_000;

export default async function SalonBoekingenPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const cleanCode = (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
  const user = await requireOwner(`/dashboard/boekingen${cleanCode ? `?code=${cleanCode}` : ""}`);
  const t = await getTranslations("ui.dashboard");
  const statusText = await getTranslations("ui.bookings");
  const common = await getTranslations("ui.common");
  const locale = await getLocale();
  const now = new Date();

  const ownerSlot = user.role === "ADMIN" ? {} : { salon: { ownerId: user.id } };
  const statuses = ["PAID", "NO_SHOW", "CANCELLED", "REFUNDED"] as const;
  const where = (endsAt: { gt: Date } | { lte: Date }) => ({ status: { in: [...statuses] }, slot: { ...ownerSlot, endsAt } });
  // Only what the page shows: no e-mail address, no payment ids.
  const select = {
    id: true,
    status: true,
    amount: true,
    customerName: true,
    customerPhone: true,
    confirmationCode: true,
    checkedInAt: true,
    slot: { select: { title: true, startsAt: true, endsAt: true, salon: { select: { name: true } } } },
  } as const;

  let loadFailed = false;
  let upcoming: Awaited<ReturnType<typeof loadRows>> = [];
  let earlier: typeof upcoming = [];
  let salonCount = 1;
  function loadRows(endsAt: { gt: Date } | { lte: Date }, order: "asc" | "desc", take: number) {
    return prisma.booking.findMany({ where: where(endsAt), select, orderBy: { slot: { startsAt: order } }, take });
  }
  try {
    [upcoming, earlier, salonCount] = await Promise.all([
      loadRows({ gt: now }, "asc", 100),
      loadRows({ lte: now }, "desc", EARLIER_LIMIT),
      prisma.salon.count({ where: user.role === "ADMIN" ? {} : { ownerId: user.id } }),
    ]);
  } catch {
    loadFailed = true;
  }

  const all = [...upcoming, ...earlier].map((b) => ({ ...b, startsAt: b.slot.startsAt, endsAt: b.slot.endsAt }));
  const groups = groupBookings(all, now);
  const heading = { today: t("bookings.groupToday"), tomorrow: t("bookings.groupTomorrow"), later: t("bookings.groupLater"), earlier: t("bookings.groupEarlier") } as const;

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl text-ink">{t("bookingsTitle")}</h1>
        <p className="mt-1 text-stone-600">{t("bookingsLead")}</p>
      </div>

      <CheckInForm initialCode={cleanCode} />

      {loadFailed ? (
        <EmptyState
          title={t("bookings.loadError")}
          body={t("bookings.loadErrorBody")}
          action={
            <Link href="/dashboard/boekingen" className="font-semibold text-brand underline underline-offset-4">
              {common("retry")}
            </Link>
          }
        />
      ) : groups.length === 0 ? (
        <EmptyState
          title={t("emptyBookings")}
          body={t("bookings.emptyBody")}
          action={
            <Link href="/dashboard#publiceren" className="font-semibold text-brand underline underline-offset-4">
              {t("bookings.emptyCta")}
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`group-${group.key}`} className="space-y-3">
              <h2 id={`group-${group.key}`} className="text-lg text-ink">
                {heading[group.key]}
              </h2>
              <ul className="space-y-3">
                {group.items.map((b) => {
                  const isPaid = b.status === "PAID" || b.status === "NO_SHOW";
                  const upcomingRow = b.endsAt > now;
                  const statusKey = b.status === "PAID" && b.checkedInAt ? "present" : b.status;
                  return (
                    <li key={b.id}>
                      <Card className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-ink">{b.customerName}</p>
                            <p className="text-sm text-stone-600">
                              {formatRange(b.startsAt, b.endsAt, locale)} · {b.slot.title}
                            </p>
                            {salonCount > 1 && <p className="text-sm text-stone-600">{b.slot.salon.name}</p>}
                            {isPaid && (
                              <p className="mt-1 text-sm text-stone-700">
                                {t("bookings.codeLabel")}: <span className="font-mono tracking-wider">{b.confirmationCode}</span>
                                {upcomingRow && b.status === "PAID" && b.customerPhone && (
                                  <>
                                    {" · "}
                                    <a href={`tel:${b.customerPhone.replace(/[^+\d]/g, "")}`} aria-label={t("bookings.call", { name: b.customerName })} className="underline underline-offset-2">
                                      {b.customerPhone}
                                    </a>
                                  </>
                                )}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1 text-right">
                            <StatusPill status={b.status} label={statusKey === "present" ? t("present") : statusText(b.status)} />
                            <p className="text-sm font-semibold text-ink">{formatEuro(b.amount, locale)}</p>
                          </div>
                        </div>
                        <BookingActions
                          bookingId={b.id}
                          code={b.confirmationCode}
                          name={b.customerName}
                          amountLabel={formatEuro(b.amount, locale)}
                          canCheckIn={
                            b.status === "PAID" &&
                            !b.checkedInAt &&
                            now.getTime() >= b.startsAt.getTime() - CHECKIN_BEFORE_MS &&
                            now.getTime() <= b.endsAt.getTime() + CHECKIN_AFTER_MS
                          }
                          canNoShow={b.status === "PAID" && !b.checkedInAt && now.getTime() >= b.startsAt.getTime() + NO_SHOW_GRACE_MINUTES * 60_000}
                          canRefund={b.status === "PAID" && !b.checkedInAt && b.endsAt > now}
                        />
                      </Card>
                    </li>
                  );
                })}
              </ul>
              {group.key === "earlier" && earlier.length >= EARLIER_LIMIT && <p className="text-sm text-stone-600">{t("bookings.earlierNote", { count: EARLIER_LIMIT })}</p>}
            </section>
          ))}
          <p className="text-sm text-stone-600">{t("bookings.privacy")}</p>
        </div>
      )}
    </div>
  );
}
