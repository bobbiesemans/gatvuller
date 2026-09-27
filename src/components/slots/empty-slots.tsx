"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapPinned, Heart, FilterX } from "lucide-react";

export function EmptySlots({
  favOnly,
  hasFilters,
  onClear,
}: {
  favOnly?: boolean;
  hasFilters?: boolean;
  onClear?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
        {favOnly ? <Heart className="h-7 w-7" /> : <MapPinned className="h-7 w-7" />}
      </div>
      <h3 className="text-lg font-extrabold text-slate-900">
        {favOnly ? "Nog geen favorieten" : "Geen Surprise slots hier"}
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
        {favOnly
          ? "Tik op het hartje op een card om hem hier terug te vinden — ook offline in deze browser."
          : hasFilters
            ? "Probeer een andere stad of categorie, of wis je filters."
            : "Kom later terug — salons posten last-minute gaten doorheen de dag."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {(favOnly || hasFilters) && onClear && (
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            <FilterX className="h-4 w-4" /> Filters wissen
          </Button>
        )}
        <Button asChild size="sm">
          <Link href="/slots">Alle slots</Link>
        </Button>
      </div>
    </div>
  );
}
