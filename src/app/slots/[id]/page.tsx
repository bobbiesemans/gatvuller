import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Clock, MapPin, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { isDemoMode, PAYMENT_HOLD_MINUTES, PLATFORM_FEE_PERCENT } from "@/lib/config";
import { bookingLeadCutoff, isSalonBookable, paymentModeFor } from "@/lib/marketplace";
import { discountPercent, formatEuro } from "@/lib/money";
import { formatInZone, minutesBetween } from "@/lib/time";
import { toLocale } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { ReviewList } from "@/components/ui/review-list";
import { StartsIn } from "@/components/ui/starts-in";
import { ShareButton } from "@/components/share-button";
import { FavoriteButton } from "@/components/favorite-button";
import { ReportOffer } from "@/components/report-offer";
import { TrackOnMount } from "@/components/track-on-mount";
import { MiniMap } from "@/components/map/mini-map";
import { BookForm } from "./book-form";

export const dynamic = "force-dynamic";

const OG_LOCALE = { nl: "nl_BE", fr: "fr_BE", en: "en_GB" } as const;

function visible(salon: { status: string; isDemo: boolean }) {
  return salon.status === "ACTIVE" && (!salon.isDemo || isDemoMode());
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const [t, locale] = await Promise.all([getTranslations("ui.offer"), getLocale()]);
  const lc = toLocale(locale);
  const slot = await prisma.slot.findUnique({
    where: { id },
    select: {
      title: true,
      startsAt: true,
      originalPrice: true,
      discountPrice: true,
      salon: { select: { name: true, city: true, cancellationHours: true, status: true, isDemo: true } },
    },
  });
  const robots = { index: false, follow: false };
  if (!slot || !visible(slot.salon)) return { title: t("metaNotFound"), robots };
  const title = t("metaTitle", { title: slot.title, salon: slot.salon.name });
  const description = t("metaDescription", {
    title: slot.title,
    salon: slot.salon.name,
    city: slot.salon.city,
    price: formatEuro(slot.discountPrice, lc),
    original: formatEuro(slot.originalPrice, lc),
    when: formatInZone(slot.startsAt, lc, "dayTime"),
    hours: slot.salon.cancellationHours,
  });
  return {
    title,
    description,
    robots,
    alternates: { canonical: `/slots/${id}` },
    openGraph: { title, description, url: `/slots/${id}`, type: "website", locale: OG_LOCALE[lc] },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SlotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [locale, t, book, card, common, voucher] = await Promise.all([
    getLocale(),
    getTranslations("ui.offer"),
    getTranslations("ui.book"),
    getTranslations("ui.card"),
    getTranslations("ui.common"),
    getTranslations("ui.voucher"),
  ]);
  const lc = toLocale(locale);
  const slot = await prisma.slot.findUnique({
    where: { id },
    include: {
      salon: {
        include: {
          reviews: {
            where: { hidden: false },
            orderBy: { createdAt: "desc" },
            take: 6,
            include: { customer: { select: { name: true } } },
          },
        },
      },
    },
  });
  if (!slot || !visible(slot.salon)) notFound();
  const salon = slot.salon;
  const me = await getCurrentUser();
  const favorite = me
    ? await prisma.favoriteSalon.findUnique({ where: { userId_salonId: { userId: me.id, salonId: slot.salonId } } })
    : null;

  const now = Date.now();
  const pct = discountPercent(slot.originalPrice, slot.discountPrice);
  const bookable = isSalonBookable(salon);
  const isOpen = slot.status === "OPEN" && slot.spotsLeft > 0 && slot.startsAt > bookingLeadCutoff() && bookable;
  const reason =
    slot.spotsLeft <= 0 || slot.status === "BOOKED"
      ? "reasonFull"
      : slot.status !== "OPEN" || slot.startsAt <= bookingLeadCutoff()
        ? "reasonClosed"
        : "reasonOff";
  const deadline = new Date(slot.startsAt.getTime() - salon.cancellationHours * 3_600_000);
  const cancelOpen = deadline.getTime() > now;
  const minutes = minutesBetween(slot.startsAt, slot.endsAt);
  const rated = salon.ratingCount > 0;
  const simulated = paymentModeFor(salon) === "DEMO";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <TrackOnMount name="offer_viewed" entityId={slot.id} />
      <Link href="/slots" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-stone-600 underline-offset-4 hover:underline">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {t("back")}
      </Link>

      <div className="grid gap-6 md:grid-cols-5 md:gap-x-8">
        <div className="space-y-4 md:col-span-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            {card(`category.${salon.category}`)}
            {salon.isDemo && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs normal-case tracking-normal text-amber-900">{common("demo")}</span>}
          </p>
          <h1 className="text-3xl text-ink md:text-4xl">{slot.title}</h1>
          <div className="space-y-1.5 text-sm text-stone-700">
            <p>
              <Link href={`/salon/${salon.slug}`} className="font-semibold text-ink underline underline-offset-4">
                {salon.name}
              </Link>
              <span className="text-stone-500"> · {salon.isDemo ? common("demo") : salon.verified ? common("verified") : common("unverified")}</span>
            </p>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <Star aria-hidden="true" className="h-4 w-4 fill-amber-400 text-amber-400" />
                {rated ? t("ratingSummary", { rating: salon.ratingAvg.toFixed(1), count: salon.ratingCount }) : card("noRating")}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden="true" className="h-4 w-4 text-brand" />
                {salon.address}, {salon.city}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FavoriteButton salonId={slot.salonId} initial={Boolean(favorite)} loggedIn={Boolean(me)} className="h-11 w-11" />
            <ShareButton title={slot.title} />
          </div>

          <Card>
            <CardContent className="space-y-3 p-5 text-sm text-stone-700">
              <h2 className="text-lg text-ink">{book("details")}</h2>
              <p className="flex items-start gap-2 text-base font-medium text-ink">
                <Clock aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-brand" />
                <span>
                  {formatInZone(slot.startsAt, lc, "full")} – {formatInZone(slot.endsAt, lc, "time")}
                  <span className="block text-sm font-normal text-stone-600">{t("duration", { minutes })}</span>
                </span>
              </p>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <StartsIn to={slot.startsAt.toISOString()} now={now} />
                <span className="text-stone-600">{card("places", { count: Math.max(0, slot.spotsLeft) })}</span>
              </p>
              {slot.description && <p>{slot.description}</p>}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 md:col-start-4 md:row-span-3 md:row-start-1 md:self-start">
          <Card className="overflow-hidden md:sticky md:top-24">
            <div className="bg-brand px-5 py-4 text-white">
              <p className="text-sm text-brand-soft">{book("lastMinute")}</p>
              <div className="mt-1 flex items-end justify-between gap-3">
                <p className="text-3xl font-semibold tabular-nums">{formatEuro(slot.discountPrice, lc)}</p>
                {pct > 0 && (
                  <p className="text-right text-sm text-brand-soft">
                    <span className="line-through">{formatEuro(slot.originalPrice, lc)}</span>
                    <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#8f3820]">−{pct}%</span>
                  </p>
                )}
              </div>
            </div>
            <CardContent className="space-y-4 p-5">
              {salon.isDemo && <Notice tone="warn">{t("demoNotice")}</Notice>}
              {!isOpen ? (
                <div className="space-y-3">
                  <Notice>{t(reason)}</Notice>
                  <Button asChild className="w-full">
                    <Link href={`/salon/${salon.slug}`}>{t("salonHours")}</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/slots">{t("otherHours")}</Link>
                  </Button>
                </div>
              ) : (
                <BookForm
                  slotId={slot.id}
                  price={slot.discountPrice}
                  originalPrice={slot.originalPrice}
                  feePercent={PLATFORM_FEE_PERCENT}
                  cancellationHours={salon.cancellationHours}
                  cancelDeadline={formatInZone(deadline, lc, "dayTime")}
                  cancelOpen={cancelOpen}
                  holdMinutes={PAYMENT_HOLD_MINUTES}
                  demoMode={simulated}
                  defaultName={me?.name || ""}
                  defaultEmail={me?.email || ""}
                  loggedIn={Boolean(me)}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8 md:col-span-3">
          <section aria-labelledby="about">
            <h2 id="about" className="text-lg text-ink">
              {t("about", { name: salon.name })}
            </h2>
            <p className="mt-1 text-sm text-stone-700">{salon.description}</p>
            <p className="mt-2 text-sm">
              <Link href={`/salon/${salon.slug}`} className="font-semibold text-brand underline underline-offset-4">
                {t("viewSalon")}
              </Link>
            </p>
          </section>

          <section aria-labelledby="location">
            <h2 id="location" className="mb-2 text-lg text-ink">
              {book("location")}
            </h2>
            <p className="mb-2 text-sm text-stone-700">
              {salon.address}, {salon.postalCode ? `${salon.postalCode} ` : ""}
              {salon.city}
            </p>
            <MiniMap lat={salon.lat} lng={salon.lng} label={salon.name} className="h-56 w-full overflow-hidden rounded-2xl border border-stone-200" />
            {!salon.locationExact && <p className="mt-2 text-xs text-stone-500">{t("locationApprox")}</p>}
            <p className="mt-2 text-sm">
              <a
                href={`https://www.openstreetmap.org/?mlat=${salon.lat}&mlon=${salon.lng}#map=16/${salon.lat}/${salon.lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-4"
              >
                {voucher("openMap")}
              </a>
            </p>
          </section>

          <section aria-labelledby="conditions" className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-700">
            <h2 id="conditions" className="text-lg text-ink">
              {t("conditionsTitle")}
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>{t("conditionCancel", { hours: salon.cancellationHours })}</li>
              <li>{t("conditionNoShow")}</li>
              <li>{t("conditionFee", { percent: PLATFORM_FEE_PERCENT })}</li>
            </ul>
          </section>

          <section aria-labelledby="reviews">
            <h2 id="reviews" className="mb-2 text-lg text-ink">
              {book("reviews")}
            </h2>
            {salon.reviews.length > 0 ? (
              <ReviewList
                locale={lc}
                reviews={salon.reviews.map((r) => ({
                  id: r.id,
                  rating: r.rating,
                  comment: r.comment,
                  createdAt: r.createdAt,
                  verifiedVisit: r.verifiedVisit,
                  reply: r.reply,
                  customerName: r.customer.name,
                }))}
              />
            ) : (
              <p className="text-sm text-stone-600">{t("noReviews")}</p>
            )}
          </section>

          <ReportOffer slotId={slot.id} salonId={slot.salonId} target="offer" />
        </div>
      </div>
    </div>
  );
}
