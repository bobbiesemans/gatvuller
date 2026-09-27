import { COMPANY } from "./config";
import { distanceKm } from "./utils";
import type { City } from "./catalog";

export type GeoPoint = { lat: number; lng: number; postalCode?: string };

/** Nominatim (OpenStreetMap): free, no key; policy requires an identifying User-Agent and low volume. */
export async function geocodeAddress(address: string, city: City): Promise<GeoPoint | null> {
  if (process.env.GEOCODING_DISABLED === "true") return null;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", city.country.toLowerCase());
  url.searchParams.set("q", address.toLowerCase().includes(city.name.toLowerCase()) ? address : `${address}, ${city.name}`);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": `GatVuller/1.0 (${COMPANY.email})`, "Accept-Language": "nl" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string; address?: { postcode?: string } }[];
    const hit = data[0];
    if (!hit) return null;
    const point = { lat: Number(hit.lat), lng: Number(hit.lon) };
    // Reject matches in another town with the same street name.
    if (!Number.isFinite(point.lat) || distanceKm(point, city) > 30) return null;
    return { ...point, postalCode: hit.address?.postcode };
  } catch {
    return null;
  }
}

/** Fallback pin near the city centre so new salons don't stack on one marker. */
export function approximateLocation(city: City): GeoPoint {
  const jitter = () => (Math.random() - 0.5) * 0.02;
  return { lat: city.lat + jitter(), lng: city.lng + jitter() };
}
