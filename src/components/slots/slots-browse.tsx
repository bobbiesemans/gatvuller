"use client";

import { useEffect, useMemo, useState } from "react";
import { SlotCard } from "@/components/slot-card";
import { SlotsMapDynamic, type MapSlot } from "@/components/map/slots-map-dynamic";
import { Button } from "@/components/ui/button";
import { distanceKm, CATEGORY_LABELS, CATEGORY_EMOJI } from "@/lib/utils";
import { getStoredLocation, requestUserLocation, type LatLng } from "@/lib/geo";
import { getFavorites } from "@/lib/favorites";
import { List, Map as MapIcon, LocateFixed, Heart } from "lucide-react";

type Slot = MapSlot;

export function SlotsBrowse({ slots, initialCity }: { slots: Slot[]; initialCity?: string }) {
  const [view, setView] = useState<"split" | "list" | "map">("split");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [favOnly, setFavOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"time" | "distance" | "discount">("time");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [locError, setLocError] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [catFilter, setCatFilter] = useState<string | null>(null);

  useEffect(() => {
    setUserLoc(getStoredLocation());
    const sync = () => setFavorites(getFavorites());
    sync();
    window.addEventListener("gv-favorites", sync);
    // desktop default split, mobile list
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setView(mq.matches ? "split" : "list");
    apply();
    mq.addEventListener("change", apply);
    return () => {
      window.removeEventListener("gv-favorites", sync);
      mq.removeEventListener("change", apply);
    };
  }, []);

  const enriched = useMemo(() => {
    return slots
      .map((s) => ({
        ...s,
        distanceKm: userLoc
          ? distanceKm(userLoc, { lat: s.salon.lat, lng: s.salon.lng })
          : null,
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
    if (favOnly && !favorites.includes(s.id)) return false;
    if (catFilter && s.salon.category !== catFilter) return false;
    return true;
  });
  const categories = useMemo(() => {
    const set = new Set(slots.map((s) => s.salon.category));
    return Array.from(set).sort();
  }, [slots]);

  async function nearMe() {
    setLocLoading(true);
    setLocError(null);
    try {
      const loc = await requestUserLocation();
      setUserLoc(loc);
    } catch {
      setLocError("Kon locatie niet ophalen. Sta toegang toe in je browser.");
    } finally {
      setLocLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
              view === "list" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <List className="h-4 w-4" /> Lijst
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
              view === "map" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <MapIcon className="h-4 w-4" /> Kaart
          </button>
          <button
            type="button"
            onClick={() => setView("split")}
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
              view === "split" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Beide
          </button>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={nearMe} disabled={locLoading}>
          <LocateFixed className="h-4 w-4" />
          {locLoading ? "Bezig…" : "Bij mij in de buurt"}
        </Button>

        <Button
          type="button"
          variant={favOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setFavOnly((v) => !v)}
        >
          <Heart className={`h-4 w-4 ${favOnly ? "fill-white" : ""}`} />
          Favorieten{favorites.length ? ` (${favorites.length})` : ""}
        </Button>

        <p className="ml-auto text-sm text-slate-500">{visible.length} surprise slots</p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="text-slate-500" htmlFor="sort">Sorteer</label>
        <select
          id="sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700"
        >
          <option value="time">Tijdvenster</option>
          <option value="distance">Afstand</option>
          <option value="discount">Hoogste korting</option>
        </select>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCatFilter(null)}
            className={`rounded-full px-3 py-1 text-xs font-semibold border ${
              !catFilter ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            Alle
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCatFilter(c === catFilter ? null : c)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                catFilter === c ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              {CATEGORY_EMOJI[c] || ""} {CATEGORY_LABELS[c] || c}
            </button>
          ))}
        </div>
      )}

      {locError && <p className="text-sm text-rose-600">{locError}</p>}
      {userLoc && (
        <p className="text-xs text-slate-500">
          Gesorteerd op afstand vanaf jouw locatie ({userLoc.lat.toFixed(3)}, {userLoc.lng.toFixed(3)})
        </p>
      )}

      {view === "list" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((s) => (
            <div key={s.id} onMouseEnter={() => setSelectedId(s.id)}>
              <SlotCard {...s} selected={selectedId === s.id} />
            </div>
          ))}
        </div>
      )}

      {view === "map" && (
        <div className="h-[70vh] min-h-[420px]">
          <SlotsMapDynamic
            slots={visible}
            selectedId={selectedId}
            onSelect={setSelectedId}
            userLocation={userLoc}
            initialCity={initialCity}
            className="h-full w-full rounded-2xl overflow-hidden border border-slate-200"
          />
        </div>
      )}

      {view === "split" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {visible.map((s) => (
              <div
                key={s.id}
                onMouseEnter={() => setSelectedId(s.id)}
                onClick={() => setSelectedId(s.id)}
              >
                <SlotCard {...s} selected={selectedId === s.id} />
              </div>
            ))}
            {visible.length === 0 && (
              <div className="rounded-2xl border border-dashed p-10 text-center text-slate-500">
                Geen slots voor deze filters.
              </div>
            )}
          </div>
          <div className="sticky top-20 h-[70vh] min-h-[420px]">
            <SlotsMapDynamic
              slots={visible}
              selectedId={selectedId}
              onSelect={setSelectedId}
              userLocation={userLoc}
              initialCity={initialCity}
              className="h-full w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm"
            />
          </div>
        </div>
      )}

      {view === "list" && visible.length === 0 && (
        <div className="rounded-2xl border border-dashed p-10 text-center text-slate-500">
          Geen slots voor deze filters.
        </div>
      )}
    </div>
  );
}
