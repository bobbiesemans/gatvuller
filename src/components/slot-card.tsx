import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { discountPercent, formatDistance, formatEuro, saveAmount } from "@/lib/utils";
import { FavoriteButton } from "@/components/favorite-button";
import { Countdown } from "@/components/countdown";
import { MapPin, Clock } from "lucide-react";
import { formatInZone } from "@/lib/time";
import { cityLabel } from "@/lib/discovery";

export type SlotCardData = {
  id: string;
  title: string;
  startsAt: Date | string;
  endsAt: Date | string;
  originalPrice: number;
  discountPrice: number;
  spotsLeft?: number;
  salon: {
    id?: string;
    name: string;
    city: string;
    category: string;
    rating: number;
    ratingCount?: number;
    address?: string;
    imageUrl?: string | null;
  };
  distanceKm?: number | null;
  selected?: boolean;
  /** This salon is one of the viewer's favourites (the heart starts filled). */
  favorite?: boolean;
};

export function SlotCard({
  id,
  title,
  startsAt,
  endsAt,
  originalPrice,
  discountPrice,
  spotsLeft = 1,
  salon,
  distanceKm,
  selected,
  favorite = false,
}: SlotCardData) {
  const locale = useLocale();
  const t = useTranslations("ui.card");
  const cityT = useTranslations("ui.city");
  const pct = discountPercent(originalPrice, discountPrice);
  const save = saveAmount(originalPrice, discountPrice);
  const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  const dist = formatDistance(distanceKm ?? null, locale);
  const rated = (salon.ratingCount ?? 0) > 0;
  const category = t(`category.${salon.category}`);

  return (
    <article className={`group relative overflow-hidden rounded-2xl border bg-white transition hover:shadow-xl hover:shadow-stone-900/5 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none ${selected ? "border-brand" : "border-[#e9e2d9]"}`}>
      <Link href={`/slots/${id}`} className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
        <div className="relative h-40 overflow-hidden bg-brand-soft">
          {salon.imageUrl ? (
            <Image src={salon.imageUrl} alt="" fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition duration-300 motion-safe:group-hover:scale-[1.03] motion-reduce:transition-none" />
          ) : (
            <div className="flex h-full items-end bg-[#efe3d6] p-5">
              <span className="font-serif text-2xl text-[#3b332b]">{category}</span>
            </div>
          )}
          <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-[#a0462c] shadow-sm">
            <span aria-hidden="true">−{pct}%</span>
            <span className="sr-only">{t("discount", { percent: pct })}</span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-stone-900">{salon.name}</p>
            <p className="truncate text-xs text-stone-600">
              {category} · {cityLabel(cityT, salon.city)}
              {dist ? ` · ${dist}` : ""}
            </p>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-bold text-stone-950">{title}</h3>
            <div className="text-right">
              <p className="text-lg font-extrabold text-stone-950">{formatEuro(discountPrice, locale)}</p>
              <p className="text-xs text-stone-600 line-through">{formatEuro(originalPrice, locale)}</p>
            </div>
          </div>
          <p className="text-sm text-stone-700">{t("save", { amount: formatEuro(save, locale) })}</p>
          <p className="flex items-center gap-2 text-sm text-stone-700">
            <Clock aria-hidden="true" className="h-4 w-4 shrink-0" />
            {formatInZone(start, locale, "dayTime")}–{formatInZone(endsAt, locale, "time")}
          </p>
          <div className="flex items-center justify-between gap-3 text-xs text-stone-600">
            <Countdown to={start} />
            <span>{t("places", { count: spotsLeft })}</span>
          </div>
          <p className="flex items-center gap-2 text-xs text-stone-600">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            {rated ? t("rating", { rating: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(salon.rating) }) : t("noRating")}
          </p>
        </div>
      </Link>
      {salon.id ? <FavoriteButton salonId={salon.id} initial={favorite} className="absolute right-3 top-3 z-10" /> : null}
    </article>
  );
}
