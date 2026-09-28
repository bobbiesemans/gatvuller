"use client";
import { useLocale } from "next-intl";
import { formatInZone } from "@/lib/time";

import Link from "next/link";
import { discountPercent, formatDistance, formatEuro, CATEGORY_EMOJI } from "@/lib/utils";
import type { MapSlot } from "@/components/map/slots-map-dynamic";
import { X } from "lucide-react";

export function FloatingSlotCard({
  slot,
  onClose,
}: {
  slot: MapSlot & { distanceKm?: number | null };
  onClose: () => void;
}) {
  const lc = useLocale();
  const pct = discountPercent(slot.originalPrice, slot.discountPrice);
  const dist = formatDistance(slot.distanceKm ?? null);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
      <div className="flex items-start gap-3 p-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#b4492b] to-[#b4492b] text-xl text-white shadow">
          {CATEGORY_EMOJI[slot.salon.category] || "⭐"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">{slot.title}</p>
              <p className="text-xs text-slate-500 truncate">
                {slot.salon.name} · ★ {slot.salon.rating.toFixed(1)}
                {dist ? ` · ${dist}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Sluiten"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div>
              <p className="text-lg font-extrabold text-[#b4492b] leading-none">
                {formatEuro(slot.discountPrice)}
              </p>
              <p className="text-[11px] text-slate-400 line-through">{formatEuro(slot.originalPrice)}</p>
            </div>
            <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-extrabold text-white">
              -{pct}%
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {formatInZone(slot.startsAt, lc, "dayTime")}–
            {formatInZone(slot.endsAt, lc, "time")}
          </p>
          <Link
            href={`/slots/${slot.id}`}
            className="mt-3 flex w-full items-center justify-center rounded-xl bg-[#b4492b] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#b4492b]"
          >
            Reserveer last-minute afspraak
          </Link>
        </div>
      </div>
    </div>
  );
}
