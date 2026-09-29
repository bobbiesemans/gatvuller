"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MapPinned, Heart, FilterX } from "lucide-react";

/** Nothing to show: says why, offers a way out, and (when given) an alert sign-up below. */
export function EmptySlots({
  favOnly,
  hasFilters,
  hasClientFilters,
  onClear,
  extra,
}: {
  favOnly?: boolean;
  hasFilters?: boolean;
  hasClientFilters?: boolean;
  /** Clears the filters that only live in the browser (favourites, distance). */
  onClear?: () => void;
  /** Rendered under the message, for example the alert sign-up. */
  extra?: React.ReactNode;
}) {
  const t = useTranslations("ui.slots");
  const city = useTranslations("ui.city");
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          {favOnly ? <Heart aria-hidden="true" className="h-6 w-6" /> : <MapPinned aria-hidden="true" className="h-6 w-6" />}
        </div>
        <h3 className="text-lg text-ink">{favOnly ? t("emptyFavTitle") : t("emptyTitle")}</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-stone-600">
          {favOnly ? t("emptyFavBody") : hasFilters ? t("emptyFilters") : t("emptyNone")}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {hasFilters && (
            <Button asChild variant="outline">
              <Link href="/slots"><FilterX aria-hidden="true" className="h-4 w-4" />{t("clear")}</Link>
            </Button>
          )}
          {hasClientFilters && onClear && (
            <Button type="button" variant="outline" onClick={onClear}>
              <FilterX aria-hidden="true" className="h-4 w-4" />{t("clear")}
            </Button>
          )}
          {!hasFilters && !hasClientFilters && (
            <Button asChild variant="outline">
              <Link href="/slots">{city("all")}</Link>
            </Button>
          )}
        </div>
      </div>
      {extra}
    </div>
  );
}
