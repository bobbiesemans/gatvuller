"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { List, Map as MapIcon, LocateFixed, Heart } from "lucide-react";
import { SlotCard } from "@/components/slot-card";
import { SlotsMapDynamic, type MapSlot } from "@/components/map/slots-map-dynamic";
import { Button } from "@/components/ui/button";
import { EmptySlots } from "@/components/slots/empty-slots";
import { distanceKm, cn } from "@/lib/utils";
import { getStoredLocation, requestUserLocation, type LatLng } from "@/lib/geo";
import { track } from "@/lib/track";

type Slot = MapSlot;
type SortBy = "time" | "distance" | "discount";

const selectClass =
  "h-11 rounded-xl border border-stone-300 bg-white px-2.5 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";

export function SlotsBrowse({
  slots,
  initialCity,
  favoriteSalonIds = [],
  initialSort = "time",
  hasFilters = false,
  emptyExtra,
}: {
  slots: Slot[];
  initialCity?: string;
  favoriteSalonIds?: string[];
  initialSort?: SortBy;
  /** Filters from the URL are active (the server already applied them). */
  hasFilters?: boolean;
  emptyExtra?: React.ReactNode;
}) {
  const [view, setView] = useState<"split" | "list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [favOnly, setFavOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>(initialSort);
  const t = useTranslations("ui.slots");
  const common = useTranslations("ui.common");
  const [locError, setLocError] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [maxKm, setMaxKm] = useState<number | null>(null);

  async function nearMe() {
    setLocLoading(true);
    setLocError(null);
    try {
      const loc = await requestUserLocation();
      setUserLoc(loc);
      setSortBy((current) => (current === "time" ? "distance" : current));
    } catch {
      setLocError(t("nearError"));
    } finally {
      setLocLoading(false);
    }
  }

  useEffect(() => {
    const stored = getStoredLocation();
    setUserLoc(stored);
    // "Near me" from the home page arrives with a distance sort: ask for the position once, on that intent.
    if (initialSort === "distance" && !stored) void nearMe();
    // desktop default split, mobile list
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setView(mq.matches ? "split" : "list");
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enriched = useMemo(() => {
    return slots
      .map((s) => ({
        ...s,
        distanceKm: userLoc ? distanceKm(userLoc, { lat: s.salon.lat, lng: s.salon.lng }) : null,
      }))
      .sort((a, b) => {
        if (sortBy === "distance" && a.distanceKm != null && b.distanceKm != null) {
          return a.distanceKm - b.distanceKm;
        }
        if (sortBy === "discount") {
          const da = (a.originalPrice - a.discountPrice) / a.originalPrice;
          const db = (b.originalPrice - b.discountPrice) / b.originalPrice;
          return db - da;
        }
        return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      });
  }, [slots, userLoc, sortBy]);

  const visible = enriched.filter((s) => {
    if (favOnly && !favoriteSalonIds.includes(s.salon.id || "")) return false;
    if (maxKm != null && (s.distanceKm == null || s.distanceKm > maxKm)) return false;
    return true;
  });
  const clientFilters = favOnly || maxKm != null;
  const clearClient = () => {
    setMaxKm(null);
    setFavOnly(false);
  };

  const viewButton = (value: "list" | "map" | "split", label: string, icon: React.ReactNode, extra = "") => (
    <button
      type="button"
      aria-pressed={view === value}
      onClick={() => setView(value)}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        view === value ? "bg-brand text-white" : "text-stone-700 hover:bg-stone-100",
        extra
      )}
    >
      {icon}
      {label}
    </button>
  );

  const cards = (className: string, onPick?: boolean) => (
    <div className={className}>
      {visible.map((s) => (
        <div
          key={s.id}
          onMouseEnter={() => setSelectedId(s.id)}
          onFocus={() => setSelectedId(s.id)}
          onClick={onPick ? () => setSelectedId(s.id) : undefined}
        >
          <SlotCard {...s} favorite={favoriteSalonIds.includes(s.salon.id || "")} selected={selectedId === s.id} />
        </div>
      ))}
    </div>
  );

  const empty = (
    <EmptySlots
      favOnly={favOnly}
      hasFilters={hasFilters}
      hasClientFilters={clientFilters}
      onClear={clearClient}
      extra={emptyExtra}
    />
  );

  const map = (className: string) => (
    <SlotsMapDynamic
      slots={visible}
      selectedId={selectedId}
      onSelect={setSelectedId}
      userLocation={userLoc}
      initialCity={initialCity}
      className={className}
    />
  );

  return (
    <div className="space-y-4">
      <h2 className="sr-only">{t("resultsTitle")}</h2>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div role="group" aria-label={t("view")} className="inline-flex rounded-xl border border-stone-300 bg-white p-0.5">
          {viewButton("list", t("list"), <List aria-hidden="true" className="h-4 w-4" />)}
          {viewButton("map", t("map"), <MapIcon aria-hidden="true" className="h-4 w-4" />)}
          {viewButton("split", t("both"), null, "hidden lg:inline-flex")}
        </div>
        <p role="status" aria-live="polite" className="text-sm font-medium text-stone-700">
          {t("results", { count: visible.length })}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={nearMe} disabled={locLoading}>
          <LocateFixed aria-hidden="true" className="h-4 w-4" />
          {locLoading ? common("loading") : t("near")}
        </Button>
        <Button
          type="button"
          variant={favOnly ? "default" : "outline"}
          aria-pressed={favOnly}
          onClick={() => setFavOnly((v) => !v)}
        >
          <Heart aria-hidden="true" className={cn("h-4 w-4", favOnly && "fill-white")} />
          {t("favorites")}
        </Button>
        <label className="inline-flex items-center gap-2 text-sm text-stone-700">
          {t("sort")}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className={selectClass}>
            <option value="time">{t("sortTime")}</option>
            <option value="distance">{t("sortDistance")}</option>
            <option value="discount">{t("sortDiscount")}</option>
          </select>
        </label>
        {userLoc && (
          <label className="inline-flex items-center gap-2 text-sm text-stone-700">
            {t("distance")}
            <select
              className={selectClass}
              value={maxKm ?? ""}
              onChange={(e) => {
                const value = e.target.value ? Number(e.target.value) : null;
                setMaxKm(value);
                if (value) track("filter_used", `km-${value}`);
              }}
            >
              <option value="">{common("all")}</option>
              <option value="2">2 km</option>
              <option value="5">5 km</option>
              <option value="10">10 km</option>
            </select>
          </label>
        )}
      </div>
      <div aria-live="polite">
        {locError && <p className="text-sm text-red-700">{locError}</p>}
        {userLoc && !locError && <p className="text-xs text-stone-600">{t("nearHint")}</p>}
      </div>

      {visible.length === 0 && view !== "map" && empty}

      {view === "list" && visible.length > 0 && cards("grid gap-4 sm:grid-cols-2 xl:grid-cols-3")}

      {view === "map" && (
        <div className="h-[70vh] min-h-[420px]">
          {map("h-full w-full overflow-hidden rounded-2xl border border-stone-200")}
        </div>
      )}

      {view === "split" && visible.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {cards("max-h-[70vh] space-y-3 overflow-y-auto pr-1", true)}
          <div className="sticky top-20 h-[70vh] min-h-[420px]">
            {map("h-full w-full overflow-hidden rounded-2xl border border-stone-200 shadow-sm")}
          </div>
        </div>
      )}
      {view === "map" && visible.length === 0 && empty}
    </div>
  );
}
