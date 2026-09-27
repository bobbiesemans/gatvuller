import Link from "next/link";
import { format } from "date-fns";
import { nlBE } from "date-fns/locale";
import {
  CATEGORY_LABELS,
  discountPercent,
  formatDistance,
  formatEuro,
  saveAmount,
} from "@/lib/utils";
import { FavoriteButton } from "@/components/favorite-button";
import { Countdown } from "@/components/countdown";
import { MapPin, Clock } from "lucide-react";

export type SlotCardData = {
  id: string;
  title: string;
  startsAt: Date | string;
  endsAt: Date | string;
  originalPrice: number;
  discountPrice: number;
  spotsLeft?: number;
  salon: {
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
}: SlotCardData) {
  const pct = discountPercent(originalPrice, discountPrice);
  const save = saveAmount(originalPrice, discountPrice);
  const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  const dist = formatDistance(distanceKm ?? null);
  const rated = (salon.ratingCount ?? 0) > 0;

  return (
    <Link
      href={`/slots/${id}`}
      className={`block overflow-hidden rounded-2xl border bg-white ${selected ? "border-stone-900" : "border-stone-200"}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-900">{salon.name}</p>
          <p className="truncate text-xs text-stone-500">
            {CATEGORY_LABELS[salon.category] || salon.category} · {salon.city}
            {dist ? ` · ${dist}` : ""}
          </p>
        </div>
        <FavoriteButton slotId={id} />
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-stone-950">{title}</h3>
          <div className="text-right">
            <p className="text-lg font-extrabold text-stone-950">{formatEuro(discountPrice)}</p>
            <p className="text-xs text-stone-400 line-through">{formatEuro(originalPrice)}</p>
          </div>
        </div>
        <p className="text-sm text-stone-600">
          {pct}% onder de normale prijs · je bespaart {formatEuro(save)}
        </p>
        <p className="flex items-center gap-2 text-sm text-stone-700">
          <Clock className="h-4 w-4" />
          {format(start, "EEE d MMM · HH:mm", { locale: nlBE })}–{format(end, "HH:mm", { locale: nlBE })}
        </p>
        <div className="flex items-center justify-between gap-3 text-xs text-stone-500">
          <Countdown to={start} label="Start over" />
          <span>{spotsLeft} {spotsLeft === 1 ? "plek" : "plekken"} vrij</span>
        </div>
        <p className="flex items-center gap-2 text-xs text-stone-500">
          <MapPin className="h-3.5 w-3.5" />
          {rated ? `${salon.rating.toFixed(1)} na een bezoek` : "Nog geen beoordeling"}
        </p>
      </div>
    </Link>
  );
}
