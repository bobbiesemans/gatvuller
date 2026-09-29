import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { BadgeCheck, Info, MapPin, Phone, Star } from "lucide-react";
import { jsonLd as jsonLdScript } from "@/lib/json-ld";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { categoryBySlug } from "@/lib/catalog";
import { appUrl, isDemoMode, PLATFORM_FEE_PERCENT } from "@/lib/config";
import { formatNumber } from "@/lib/money";
import { brusselsParts, intlLocale } from "@/lib/time";
import { toLocale } from "@/i18n/config";
import { SlotCard } from "@/components/slot-card";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareButton } from "@/components/share-button";
import { ReportOffer } from "@/components/report-offer";
import { MiniMap } from "@/components/map/mini-map";
import { Notice } from "@/components/ui/notice";
import { ReviewList } from "@/components/ui/review-list";

export const dynamic = "force-dynamic";

const OG_LOCALE = { nl: "nl_BE", fr: "fr_BE", en: "en_GB" } as const;
const SCHEMA_DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SCHEMA_TYPES: Record<string, string> = { KAPPER: "HairSalon", SCHOONHEID: "BeautySalon", NAGELS: "NailSalon", MASSAGE: "DaySpa" };

function clock(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function truncate(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function visible(salon: { status: string; isDemo: boolean }) {
  return salon.status === "ACTIVE" && (!salon.isDemo || isDemoMode());
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [t, locale] = await Promise.all([getTranslations("ui.salonPage"), getLocale()]);
  const lc = toLocale(locale);
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      name: true,
      city: true,
      description: true,
      imageUrl: true,
      status: true,
      isDemo: true,
      photos: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  });
  if (!salon || !visible(salon)) return { title: t("metaNotFound"), robots: { index: false, follow: false } };
  const title = t("metaTitle", { name: salon.name, city: salon.city });
  const description = t("metaDescription", { summary: truncate(salon.description, 130) });
  const image = salon.photos[0]?.url || salon.imageUrl;
  return {
    title,
    description,
    // A demo business exists only for showing the product: it stays out of search results.
    robots: salon.isDemo ? { index: false, follow: false } : undefined,
    alternates: { canonical: `/salon/${slug}` },
    openGraph: {
      title,
      description,
      url: `/salon/${slug}`,
      type: "website",
      locale: OG_LOCALE[lc],
      ...(image ? { images: [{ url: image, alt: salon.name }] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description },
  };
}

export default async function SalonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [locale, t, card, common, offer] = await Promise.all([
    getLocale(),
    getTranslations("ui.salonPage"),
    getTranslations("ui.card"),
    getTranslations("ui.common"),
    getTranslations("ui.offer"),
  ]);
  const lc = toLocale(locale);
  const salon = await prisma.salon.findUnique({
    where: { slug },
    include: {
      hours: { orderBy: { weekday: "asc" } },
      photos: { orderBy: { sortOrder: "asc" }, take: 5 },
      reviews: {
        where: { hidden: false },
        orderBy: { createdAt: "desc" },
        take: 12,
        include: { customer: { select: { name: true } } },
      },
      slots: {
        where: { status: "OPEN", spotsLeft: { gt: 0 }, startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 12,
      },
    },
  });
  if (!salon || !visible(salon)) notFound();
  const me = await getCurrentUser();
  const favorite = me
    ? await prisma.favoriteSalon.findUnique({ where: { userId_salonId: { userId: me.id, salonId: salon.id } } })
    : null;

  const cat = categoryBySlug(salon.category.toLowerCase());
  const rated = salon.ratingCount > 0;
  const weekdayName = (weekday: number) =>
    new Intl.DateTimeFormat(intlLocale(lc), { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 7 + weekday)));

  // Opening hours: today's status in Brussels time.
  const now = brusselsParts(new Date());
  const todayRow = salon.hours.find((h) => h.weekday === now.weekday);
  const todayStatus =
    salon.hours.length === 0
      ? null
      : !todayRow || todayRow.closed
        ? t("closedToday")
        : now.minutesOfDay < todayRow.openMin
          ? t("opensLater", { time: clock(todayRow.openMin) })
          : now.minutesOfDay < todayRow.closeMin
            ? t("openNow", { time: clock(todayRow.closeMin) })
            : t("closedNow");
  const isOpenNow = Boolean(todayRow && !todayRow.closed && now.minutesOfDay >= todayRow.openMin && now.minutesOfDay < todayRow.closeMin);

  const photos = salon.photos.length > 0 ? salon.photos.map((p) => ({ id: p.id, url: p.url, alt: p.alt, credit: p.credit })) : salon.imageUrl ? [{ id: "main", url: salon.imageUrl, alt: null, credit: null }] : [];

  const meaning = salon.isDemo ? t("demoMeaning") : salon.verified ? t("verifiedMeaning") : t("unverifiedMeaning");
  const url = `${appUrl()}/salon/${salon.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": SCHEMA_TYPES[salon.category] || "HealthAndBeautyBusiness",
    name: salon.name,
    description: salon.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: salon.address,
      postalCode: salon.postalCode || undefined,
      addressLocality: salon.city,
      addressCountry: salon.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: salon.lat, longitude: salon.lng },
    url,
    ...(salon.phone ? { telephone: salon.phone } : {}),
    ...(photos.length > 0 ? { image: photos.map((p) => p.url) } : {}),
    ...(salon.hours.some((h) => !h.closed)
      ? {
          openingHoursSpecification: salon.hours
            .filter((h) => !h.closed)
            .map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: SCHEMA_DAY[h.weekday], opens: clock(h.openMin), closes: clock(h.closeMin) })),
        }
      : {}),
    ...(rated ? { aggregateRating: { "@type": "AggregateRating", ratingValue: salon.ratingAvg, reviewCount: salon.ratingCount } } : {}),
  };

  const panel = "rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-700";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <p className="text-sm text-stone-600">
        <Link href={`/stad/${salon.city.toLowerCase()}`} className="underline underline-offset-4">
          {salon.city}
        </Link>
        {" · "}
        <Link href={`/categorie/${cat?.slug || "anders"}`} className="underline underline-offset-4">
          {card(`category.${salon.category}`)}
        </Link>
      </p>

      {salon.isDemo && (
        <div className="mt-3">
          <Notice tone="warn">{t("demoBanner")}</Notice>
        </div>
      )}

      <div className="mt-4 grid gap-8 md:grid-cols-5">
        <div className="space-y-8 md:col-span-3">
          {photos.length > 0 ? (
            <div className="space-y-2">
              <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-stone-200 bg-brand-soft">
                <Image src={photos[0].url} alt={photos[0].alt || t("photoAlt", { name: salon.name, n: 1 })} fill unoptimized priority sizes="(max-width: 768px) 100vw, 60vw" className="object-cover" />
              </div>
              {photos.length > 1 && (
                <ul className="grid grid-cols-4 gap-2">
                  {photos.slice(1, 5).map((p, i) => (
                    <li key={p.id} className="relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-brand-soft">
                      <Image src={p.url} alt={p.alt || t("photoAlt", { name: salon.name, n: i + 2 })} fill unoptimized sizes="(max-width: 768px) 25vw, 15vw" className="object-cover" />
                    </li>
                  ))}
                </ul>
              )}
              {photos.some((p) => p.credit) && (
                <p className="text-xs text-stone-500">{t("photoCredit", { credit: photos.filter((p) => p.credit).map((p) => p.credit).join(", ") })}</p>
              )}
            </div>
          ) : (
            <div className="flex h-40 items-end rounded-2xl border border-stone-200 bg-brand-soft p-5" role="img" aria-label={t("noPhotos")}>
              <p className="font-serif text-2xl text-[#5c2a1a]">{card(`category.${salon.category}`)}</p>
            </div>
          )}

          <div className="space-y-3">
            <h1 className="text-3xl text-ink md:text-4xl">{salon.name}</h1>
            <p className="text-stone-700">{salon.description}</p>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-700">
              <span className="inline-flex items-center gap-1">
                <Star aria-hidden="true" className="h-4 w-4 fill-amber-400 text-amber-400" />
                {rated ? t("ratingLine", { rating: formatNumber(salon.ratingAvg, lc, 1), count: salon.ratingCount }) : t("noRatingLine")}
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-ink">
                <BadgeCheck aria-hidden="true" className={`h-4 w-4 ${salon.verified && !salon.isDemo ? "text-emerald-700" : "text-stone-400"}`} />
                {salon.isDemo ? common("demo") : salon.verified ? common("verified") : common("unverified")}
              </span>
            </p>
            <p className="flex items-start gap-2 text-sm text-stone-600">
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              {meaning}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <FavoriteButton salonId={salon.id} initial={Boolean(favorite)} loggedIn={Boolean(me)} className="h-11 w-11" />
              <ShareButton title={salon.name} />
            </div>
          </div>

          <section aria-labelledby="offers">
            <h2 id="offers" className="text-xl text-ink">
              {t("offersTitle")}
            </h2>
            {salon.slots.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-8 text-sm text-stone-700">
                <p className="font-semibold text-ink">{t("offersEmpty")}</p>
                <p className="mt-1">{t("offersEmptyHint")}</p>
              </div>
            ) : (
              <div className="mt-3 grid gap-4">
                {salon.slots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    id={slot.id}
                    title={slot.title}
                    startsAt={slot.startsAt}
                    endsAt={slot.endsAt}
                    originalPrice={slot.originalPrice}
                    discountPrice={slot.discountPrice}
                    spotsLeft={slot.spotsLeft}
                    salon={{
                      name: salon.name,
                      city: salon.city,
                      category: salon.category,
                      rating: salon.ratingAvg,
                      ratingCount: salon.ratingCount,
                      address: salon.address,
                      imageUrl: salon.imageUrl,
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="reviews">
            <h2 id="reviews" className="text-xl text-ink">
              {t("reviewsTitle")}
            </h2>
            <p className="mt-1 text-sm text-stone-600">{t("reviewsNote")}</p>
            <div className="mt-3">
              {salon.reviews.length === 0 ? (
                <p className="text-sm text-stone-700">{t("reviewsEmpty")}</p>
              ) : (
                <ReviewList
                  locale={lc}
                  reviews={salon.reviews.map((rv) => ({
                    id: rv.id,
                    rating: rv.rating,
                    comment: rv.comment,
                    createdAt: rv.createdAt,
                    verifiedVisit: rv.verifiedVisit,
                    reply: rv.reply,
                    customerName: rv.customer.name,
                  }))}
                />
              )}
            </div>
          </section>

          <ReportOffer salonId={salon.id} target="salon" />
        </div>

        <aside className="space-y-4 md:col-span-2">
          <section className={panel} aria-labelledby="address">
            <h2 id="address" className="text-lg text-ink">
              {t("addressTitle")}
            </h2>
            <p className="mt-2 flex items-start gap-2">
              <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span>
                {salon.address}
                <br />
                {salon.postalCode} {salon.city}
              </span>
            </p>
            {salon.phone && (
              <p className="mt-2 flex items-center gap-2">
                <Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-brand" />
                <a href={`tel:${salon.phone.replace(/[^+0-9]/g, "")}`} className="inline-flex min-h-11 items-center underline underline-offset-4">
                  {salon.phone}
                </a>
              </p>
            )}
            <MiniMap lat={salon.lat} lng={salon.lng} label={salon.name} className="mt-3 h-48 w-full overflow-hidden rounded-xl border border-stone-200" />
            {!salon.locationExact && <p className="mt-2 text-xs text-stone-500">{offer("locationApprox")}</p>}
          </section>

          <section className={panel} aria-labelledby="hours">
            <h2 id="hours" className="text-lg text-ink">
              {t("hoursTitle")}
            </h2>
            {todayStatus && (
              <p className={`mt-2 font-semibold ${isOpenNow ? "text-emerald-800" : "text-stone-700"}`} role="status">
                {todayStatus}
              </p>
            )}
            {salon.hours.length === 0 ? (
              <p className="mt-2">{t("hoursEmpty")}</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
                  const row = salon.hours.find((h) => h.weekday === weekday);
                  const today = weekday === now.weekday;
                  return (
                    <li key={weekday} className={`flex justify-between gap-3 capitalize ${today ? "font-semibold text-ink" : ""}`} aria-current={today ? "date" : undefined}>
                      <span>{weekdayName(weekday)}</span>
                      <span className="tabular-nums normal-case">{!row || row.closed ? t("closed") : `${clock(row.openMin)}–${clock(row.closeMin)}`}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-xs text-stone-500">{t("hoursNote")}</p>
          </section>

          <section className={`${panel} space-y-2`} aria-labelledby="conditions">
            <h2 id="conditions" className="text-lg text-ink">
              {offer("conditionsTitle")}
            </h2>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>{offer("conditionCancel", { hours: salon.cancellationHours })}</li>
              <li>{offer("conditionNoShow")}</li>
              <li>{offer("conditionFee", { percent: PLATFORM_FEE_PERCENT })}</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
