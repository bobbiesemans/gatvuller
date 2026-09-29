import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Clock, Info, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { verifyBookingToken } from "@/lib/tokens";
import { appUrl } from "@/lib/config";
import { discountPercent, formatEuro } from "@/lib/money";
import { spacedCode } from "@/lib/utils";
import { formatInZone } from "@/lib/time";
import { reviewEligibility } from "@/lib/bookings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookingQr } from "@/components/booking-qr";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { CopyCodeButton } from "@/components/copy-code-button";
import { MiniMap } from "@/components/map/mini-map";
import { ReviewForm } from "@/components/review-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jouw boeking", robots: { index: false, follow: false } };

type Kind = "paid" | "checkedIn" | "pending" | "expired" | "cancelled" | "refunded" | "noShow";

/** The voucher. A code and a QR code only exist for a booking that is really paid; every other status says what happened. */
export default async function VoucherPage({ searchParams }: { searchParams: Promise<{ bookingId?: string; t?: string }> }) {
  const sp = await searchParams;
  if (!sp.bookingId) redirect("/boekingen");
  const [lc, t, me] = await Promise.all([getLocale(), getTranslations("ui.voucher"), getCurrentUser()]);
  const booking = await prisma.booking.findUnique({
    where: { id: sp.bookingId },
    include: { slot: { include: { salon: true } }, review: true },
  });
  if (!booking) redirect("/boekingen");
  const isCustomer = me?.id === booking.customerId;
  if (!isCustomer && me?.role !== "ADMIN" && !verifyBookingToken(booking.id, sp.t)) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/boekingen/${booking.id}`)}`);
  }

  const { slot } = booking;
  const salon = slot.salon;
  const now = new Date();
  const kind: Kind =
    booking.status === "PAID"
      ? booking.checkedInAt
        ? "checkedIn"
        : "paid"
      : booking.status === "PENDING"
        ? booking.holdExpiresAt && booking.holdExpiresAt < now
          ? "expired"
          : "pending"
        : booking.status === "EXPIRED"
          ? "expired"
          : booking.status === "CANCELLED"
            ? "cancelled"
            : booking.status === "REFUNDED"
              ? "refunded"
              : "noShow";

  const hours = booking.cancellationHours ?? salon.cancellationHours;
  const cancelOpen = kind === "paid" && now.getTime() <= slot.startsAt.getTime() - hours * 3_600_000;
  const canReview = isCustomer && kind !== "pending" && reviewEligibility(booking, now) === "ok";
  const token = sp.t ? `?t=${encodeURIComponent(sp.t)}` : "";
  const notice =
    booking.paymentMode === "DEMO" ? t("testPayment") : booking.paymentMode === "TEST" ? t("stripeTest") : null;
  const refunded = kind === "refunded" || (kind === "cancelled" && (booking.refundAmount ?? 0) > 0);
  const showPlace = kind === "paid" || kind === "checkedIn" || kind === "pending";
  const pct = discountPercent(slot.originalPrice, booking.amount);
  const cancelledBy = booking.cancelledBy && ["CUSTOMER", "SALON", "ADMIN", "SYSTEM"].includes(booking.cancelledBy) ? booking.cancelledBy : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-12">
      <header className="mb-8 text-center">
        <Badge variant={kind === "paid" || kind === "checkedIn" ? "success" : kind === "pending" ? "warn" : "default"}>
          {t(`badge.${kind}`)}
        </Badge>
        <h1 className="mt-3 text-3xl text-ink sm:text-4xl">{t(`title.${kind}`)}</h1>
        <p className="mt-2 text-stone-600">{t(`lead.${kind}`)}</p>
        {cancelledBy && kind !== "refunded" && <p className="mt-1 text-sm text-stone-500">{t(`cancelledBy.${cancelledBy}`)}</p>}
      </header>

      {notice && (
        <p role="note" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          {notice}
        </p>
      )}

      <Card className="overflow-hidden">
        {kind === "paid" && (
          <div className="bg-brand px-6 py-5 text-white">
            <p className="text-sm text-brand-soft">{t("code")}</p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-[0.2em]">{spacedCode(booking.confirmationCode)}</p>
            <div className="mt-3">
              <CopyCodeButton code={booking.confirmationCode} />
            </div>
          </div>
        )}
        <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-start">
          {kind === "paid" && <BookingQr value={`${appUrl()}/dashboard/boekingen?code=${booking.confirmationCode}`} />}
          <div className="w-full flex-1 space-y-2 text-sm text-stone-700">
            <h2 className="text-xl text-ink">{slot.title}</h2>
            <p>
              <Link href={`/salon/${salon.slug}`} className="font-semibold text-ink underline underline-offset-4">
                {salon.name}
              </Link>
              {" · "}
              {salon.ratingCount > 0 ? `★ ${salon.ratingAvg.toFixed(1)}` : t("salonNew")}
              {salon.isDemo ? ` · ${t("demoSalon")}` : ""}
            </p>
            <p className="flex items-start gap-2">
              <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              {salon.address}
            </p>
            <p className="flex items-start gap-2">
              <Clock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span>
                {formatInZone(slot.startsAt, lc, "dayMonth")} · {formatInZone(slot.startsAt, lc, "time")}–{formatInZone(slot.endsAt, lc, "time")}
              </span>
            </p>
            <div className="pt-2">
              <p className="text-xs text-stone-500">{t("total")}</p>
              <p className="text-2xl font-semibold text-brand">{formatEuro(booking.amount, lc)}</p>
              {pct > 0 && <p className="text-xs text-stone-500">{t("saving", { percent: pct, price: formatEuro(slot.originalPrice, lc) })}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {(refunded || kind === "expired" || kind === "pending") && (
        <Card className="mt-5">
          <CardContent className="space-y-1 p-5 text-sm text-stone-700">
            <p className="font-semibold text-ink">{refunded ? t("refundTitle") : t("noCharge")}</p>
            {refunded && (
              <>
                <p>{t("refundAmount", { amount: formatEuro(booking.refundAmount ?? booking.amount, lc) })}</p>
                <p className={booking.refundStatus === "FAILED" ? "font-semibold text-red-700" : "text-stone-600"}>
                  {t(`refundStatus.${booking.refundStatus ?? "PENDING"}`, { code: booking.confirmationCode })}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {showPlace && (
        <section className="mt-6" aria-labelledby="where">
          <h2 id="where" className="mb-2 text-lg text-ink">
            {t("where")}
          </h2>
          <MiniMap lat={salon.lat} lng={salon.lng} label={salon.name} className="h-56 w-full overflow-hidden rounded-2xl border border-stone-200" />
          <p className="mt-2 text-sm text-stone-600">{t("arrive")}</p>
        </section>
      )}

      {kind === "paid" && (
        <Card className="mt-6">
          <CardContent className="space-y-2 p-5 text-sm text-stone-700">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <Info aria-hidden="true" className="h-4 w-4 text-brand" /> {t("policyTitle")}
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>{cancelOpen ? t("policyCancel", { hours }) : t("policyClosed")}</li>
              <li>{t("policyNoShow")}</li>
              <li>{t("emailSent", { email: booking.customerEmail })}</li>
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex flex-wrap items-start gap-3">
        {kind === "paid" && isCustomer && cancelOpen && <CancelBookingButton bookingId={booking.id} />}
        {(kind === "paid" || kind === "checkedIn") && !isCustomer && me?.role !== "ADMIN" && (
          <Button asChild variant="outline">
            <Link href={`/login?callbackUrl=${encodeURIComponent(`/boekingen/${booking.id}`)}`}>{t("login")}</Link>
          </Button>
        )}
        {kind === "paid" && (
          <Button asChild variant="outline">
            <a href={`/api/bookings/${booking.id}/ics${token}`}>{t("calendar")}</a>
          </Button>
        )}
        {showPlace && (
          <Button asChild variant="outline">
            <a
              href={`https://www.openstreetmap.org/?mlat=${salon.lat}&mlon=${salon.lng}#map=16/${salon.lat}/${salon.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              {t("openMap")}
            </a>
          </Button>
        )}
        {(kind === "expired" || kind === "cancelled") && (
          <Button asChild>
            <Link href={`/slots/${slot.id}`}>{t("tryAgain")}</Link>
          </Button>
        )}
        <Button asChild variant={kind === "paid" ? "default" : "outline"}>
          <Link href="/slots">{t("moreOffers")}</Link>
        </Button>
      </div>

      {(kind === "paid" || kind === "checkedIn") && !isCustomer && me?.role !== "ADMIN" && (
        <p className="mt-3 text-sm text-stone-600">{t("loginToManage")}</p>
      )}
      {canReview && (
        <div className="mt-8" id="review">
          <ReviewForm bookingId={booking.id} />
        </div>
      )}
    </div>
  );
}
