"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { formatEuro, discountPercent, CATEGORY_EMOJI, formatDistance } from "@/lib/utils";
import { format } from "date-fns";
import { nlBE } from "date-fns/locale";
export type MapSlot = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  originalPrice: number;
  discountPrice: number;
  spotsLeft: number;
  salon: {
    name: string;
    city: string;
    category: string;
    rating: number;
    address: string;
    lat: number;
    lng: number;
  };
  distanceKm?: number | null;
};
function priceIcon(pct: number, selected: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [54, 32],
    iconAnchor: [27, 32],
    popupAnchor: [0, -28],
    html: `<div style="background:${selected ? "#5b21b6" : "#6d28d9"};color:white;font-weight:800;font-size:12px;padding:6px 10px;border-radius:999px;box-shadow:0 8px 20px rgba(91,33,182,.35);border:2px solid white;white-space:nowrap;transform:${selected ? "scale(1.08)" : "none"}">-${pct}%</div>`,
  });
}
function clusterIcon(count: number) {
  return L.divIcon({
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    html: `<div style="width:40px;height:40px;border-radius:999px;background:#5b21b6;color:white;display:flex;align-items:center;justify-content:center;font-weight:800;border:3px solid white;box-shadow:0 8px 20px rgba(0,0,0,.25)">${count}</div>`,
  });
}
function FitBounds({ points, user }: { points: { lat: number; lng: number }[]; user?: { lat: number; lng: number } | null }) {
  const map = useMap();
  const key = JSON.stringify([...points, user].filter(Boolean));
  useEffect(() => {
    const all = [...points];
    if (user) all.push(user);
    if (!all.length) return;
    if (all.length === 1) {
      map.setView([all[0].lat, all[0].lng], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(all.map((p) => [p.lat, p.lng] as [number, number])).pad(0.2));
  }, [map, key, points, user]);
  return null;
}
function FlyToSelected({ slot }: { slot?: MapSlot | null }) {
  const map = useMap();
  useEffect(() => {
    if (!slot) return;
    map.flyTo([slot.salon.lat, slot.salon.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [slot, map]);
  return null;
}
function useMapZoom() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useEffect(() => {
    const h = () => setZoom(map.getZoom());
    map.on("zoomend", h);
    return () => {
      map.off("zoomend", h);
    };
  }, [map]);
  return zoom;
}
function clusterSlots(slots: MapSlot[], zoom: number) {
  if (slots.length < 12 || zoom >= 13) return slots.map((s) => ({ type: "slot" as const, slot: s }));
  const cell = zoom >= 11 ? 0.02 : zoom >= 9 ? 0.05 : 0.12;
  const buckets = new Map<string, MapSlot[]>();
  for (const s of slots) {
    const k = `${Math.round(s.salon.lat / cell)}_${Math.round(s.salon.lng / cell)}`;
    const arr = buckets.get(k) || [];
    arr.push(s);
    buckets.set(k, arr);
  }
  const out: ({ type: "slot"; slot: MapSlot } | { type: "cluster"; lat: number; lng: number; count: number })[] = [];
  for (const arr of buckets.values()) {
    if (arr.length === 1) out.push({ type: "slot", slot: arr[0] });
    else {
      out.push({
        type: "cluster",
        lat: arr.reduce((a, s) => a + s.salon.lat, 0) / arr.length,
        lng: arr.reduce((a, s) => a + s.salon.lng, 0) / arr.length,
        count: arr.length,
      });
    }
  }
  return out;
}
function Markers({ slots, selectedId, onSelect }: { slots: MapSlot[]; selectedId?: string | null; onSelect?: (id: string) => void }) {
  const map = useMap();
  const zoom = useMapZoom();
  const items = useMemo(() => clusterSlots(slots, zoom), [slots, zoom]);
  return (
    <>
      {items.map((item, i) => {
        if (item.type === "cluster") {
          return (
            <Marker
              key={`c-${i}-${item.lat}-${item.lng}`}
              position={[item.lat, item.lng]}
              icon={clusterIcon(item.count)}
              eventHandlers={{ click: () => map.setView([item.lat, item.lng], Math.min(map.getZoom() + 2, 16)) }}
            />
          );
        }
        const s = item.slot;
        const pct = discountPercent(s.originalPrice, s.discountPrice);
        return (
          <Marker key={s.id} position={[s.salon.lat, s.salon.lng]} icon={priceIcon(pct, selectedId === s.id)} eventHandlers={{ click: () => onSelect?.(s.id) }}>
            <Popup>
              <div style={{ minWidth: 200, fontSize: 13 }}>
                <p style={{ fontWeight: 700, margin: 0 }}>
                  {CATEGORY_EMOJI[s.salon.category]} {s.title}
                </p>
                <p style={{ color: "#64748b", margin: "2px 0 6px" }}>{s.salon.name}</p>
                <p style={{ fontWeight: 800, color: "#6d28d9", margin: 0 }}>
                  {formatEuro(s.discountPrice)}{" "}
                  <span style={{ fontWeight: 400, color: "#94a3b8", textDecoration: "line-through", fontSize: 12 }}>{formatEuro(s.originalPrice)}</span>
                </p>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  {format(new Date(s.startsAt), "EEE HH:mm", { locale: nlBE })}
                  {s.distanceKm != null ? ` · ${formatDistance(s.distanceKm)}` : ""}
                </p>
                <Link href={`/slots/${s.id}`} style={{ display: "inline-block", marginTop: 8, background: "#6d28d9", color: "white", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                  Bekijk slot →
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
export function SlotsMap({
  slots,
  selectedId,
  onSelect,
  userLocation,
  className,
}: {
  slots: MapSlot[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  className?: string;
}) {
  const selected = slots.find((s) => s.id === selectedId) || null;
  const center = selected
    ? { lat: selected.salon.lat, lng: selected.salon.lng }
    : slots[0]
      ? { lat: slots[0].salon.lat, lng: slots[0].salon.lng }
      : userLocation || { lat: 51.2, lng: 4.4 };
  const points = slots.map((s) => ({ lat: s.salon.lat, lng: s.salon.lng }));
  const fixed = useRef(false);
  if (!fixed.current && typeof window !== "undefined") {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
    fixed.current = true;
  }
  return (
    <div className={className || "h-full w-full min-h-[320px] rounded-2xl overflow-hidden border border-slate-200"}>
      <MapContainer center={[center.lat, center.lng]} zoom={12} className="h-full w-full z-0" scrollWheelZoom>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={points} user={userLocation} />
        <FlyToSelected slot={selected} />
        {userLocation && (
          <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={8} pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.9 }}>
            <Popup>Jij bent hier</Popup>
          </CircleMarker>
        )}
        <Markers slots={slots} selectedId={selectedId} onSelect={onSelect} />
      </MapContainer>
    </div>
  );
}
