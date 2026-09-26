"use client";

export type LatLng = { lat: number; lng: number };

export function getStoredLocation(): LatLng | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("gv_loc");
    if (!raw) return null;
    const p = JSON.parse(raw) as LatLng;
    if (typeof p.lat === "number" && typeof p.lng === "number") return p;
  } catch {
    /* ignore */
  }
  return null;
}

export function setStoredLocation(loc: LatLng) {
  localStorage.setItem("gv_loc", JSON.stringify(loc));
}

export function requestUserLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocatie niet beschikbaar"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setStoredLocation(loc);
        resolve(loc);
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}
