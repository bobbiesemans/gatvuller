import Link from "next/link";
import { format } from "date-fns";
import { nlBE } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  discountPercent,
  formatDistance,
  formatEuro,
  saveAmount,
} from "@/lib/utils";
import { FavoriteButton } from "@/components/favorite-button";
import { Countdown } from "@/components/countdown";
import { MapPin, Clock, Star } from "lucide-react";

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
  const emoji = CATEGORY_EMOJI[salon.category] || "⭐";

  return (
    <Link
      href={`/slots/${id}`}
      className={`block group relative rounded-2xl border bg-white overflow-hidden transition hover:shadow-lg hover:border-violet-300 ${
        selected ? "ring-2 ring-violet-500 border-violet-400" : "border-slate-200"
      }`}
    >
      <div className="relative h-28 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-amber-400">
        <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-md">
            {emoji}
          </span>
          <Badge className="bg-black/40 text-white border-0 backdrop-blur">
            {CATEGORY_LABELS[salon.category] || salon.category}
          </Badge>
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-extrabold text-white shadow-md">
            -{pct}%
          </span>
          <FavoriteButton slotId={id} />
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <p className="text-white text-sm font-semibold drop-shadow">Surprise slot</p>
          <p className="rounded-lg bg-white/95 px-2 py-0.5 text-xs font-bold text-violet-800">
            Nog {spotsLeft} beschikbaar
          </p>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 truncate group-hover:text-violet-700">{title}</h3>
            <p className="text-sm text-slate-500 truncate">
              {salon.name} · {salon.city}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-extrabold text-violet-700">{formatEuro(discountPrice)}</p>
            <p className="text-xs text-slate-400 line-through">{formatEuro(originalPrice)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-violet-500" />
            {format(start, "EEE d MMM · HH:mm", { locale: nlBE })}–{format(end, "HH:mm", { locale: nlBE })}
          </span>
          {dist && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-violet-500" />
              {dist}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {salon.rating.toFixed(1)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <Countdown to={start} label="Start over" className="text-xs" />
          <span className="text-xs font-semibold text-emerald-700">Bespaar {formatEuro(save)}</span>
        </div>
      </div>
    </Link>
  );
}
