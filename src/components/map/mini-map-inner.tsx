"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Self-drawn pin: no third-party marker images, so the CSP stays tight. */
const pin = L.divIcon({
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#b4492b;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,.25)"></div>',
});

export function MiniMapInner({ lat, lng, label, className }: { lat: number; lng: number; label?: string; className?: string }) {
  return (
    <div className={className || "h-48 w-full overflow-hidden rounded-2xl border border-stone-200"}>
      <MapContainer center={[lat, lng]} zoom={15} className="h-full w-full" scrollWheelZoom={false} dragging={false}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} icon={pin} alt={label}>
          {label ? <Popup>{label}</Popup> : null}
        </Marker>
      </MapContainer>
    </div>
  );
}
