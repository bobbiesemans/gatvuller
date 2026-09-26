"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRef } from "react";

export function MiniMapInner({
  lat,
  lng,
  label,
  className,
}: {
  lat: number;
  lng: number;
  label?: string;
  className?: string;
}) {
  const fixed = useRef(false);
  if (!fixed.current && typeof window !== "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
    fixed.current = true;
  }

  return (
    <div className={className || "h-48 w-full overflow-hidden rounded-2xl border border-slate-200"}>
      <MapContainer center={[lat, lng]} zoom={15} className="h-full w-full" scrollWheelZoom={false} dragging={false}>
        <TileLayer
          attribution="&copy; OSM"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]}>
          {label ? <Popup>{label}</Popup> : null}
        </Marker>
      </MapContainer>
    </div>
  );
}
