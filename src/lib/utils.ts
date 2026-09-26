import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEuro(cents: number) {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function discountPercent(original: number, discounted: number) {
  if (original <= 0) return 0;
  return Math.round(((original - discounted) / original) * 100);
}

export function saveAmount(original: number, discounted: number) {
  return Math.max(0, original - discounted);
}

export const CATEGORY_LABELS: Record<string, string> = {
  KAPPER: "Kapper",
  TANDARTS: "Tandarts",
  SCHOONHEID: "Schoonheid",
  FYSIO: "Fysio",
  AUTODIENST: "Autodienst",
  NAGELS: "Nagels",
  MASSAGE: "Massage",
  ANDERS: "Anders",
};

export const CATEGORY_EMOJI: Record<string, string> = {
  KAPPER: "✂️",
  TANDARTS: "🦷",
  SCHOONHEID: "✨",
  FYSIO: "💪",
  AUTODIENST: "🔧",
  NAGELS: "💅",
  MASSAGE: "🧘",
  ANDERS: "⭐",
};

export const CITIES = ["Antwerpen", "Brussel", "Gent", "Amsterdam"] as const;

export const CITY_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  Antwerpen: { lat: 51.2194, lng: 4.4025, zoom: 13 },
  Brussel: { lat: 50.8503, lng: 4.3517, zoom: 13 },
  Gent: { lat: 51.0543, lng: 3.7174, zoom: 13 },
  Amsterdam: { lat: 52.3676, lng: 4.9041, zoom: 12 },
  ALL: { lat: 51.2, lng: 4.4, zoom: 8 },
};

export const PLATFORM_FEE =
  Number(process.env.PLATFORM_FEE_PERCENT || "18") || 18;

/** Haversine distance in km */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function formatDistance(km: number | null | undefined) {
  if (km == null || Number.isNaN(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function shortCode(id: string) {
  return id.slice(-8).toUpperCase();
}
