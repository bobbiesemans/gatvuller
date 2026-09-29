import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Haversine distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function formatDistance(km: number | null | undefined, locale = "nl") {
  if (km == null || Number.isNaN(km)) return null;
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  return `${new Intl.NumberFormat(locale === "en" ? "en-GB" : `${locale}-BE`, { maximumFractionDigits: 1 }).format(km)} km`;
}

export function slugify(s: string, max = 48) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, max)
    .replace(/-$/, "");
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Groups a code for reading aloud: "ABCD EFGH". */
export function spacedCode(code: string) {
  return code.replace(/(.{4})(?=.)/g, "$1 ");
}

/* UI helpers shared by pages and components. */
export { formatEuro, discountPercent, saveAmount } from "./money";

export const CATEGORY_LABELS: Record<string, string> = {
  KAPPER: "Kapper",
  SCHOONHEID: "Schoonheidssalon",
  NAGELS: "Nagelstudio",
  MASSAGE: "Massage",
  FYSIO: "Fysiotherapie",
  TANDARTS: "Tandarts",
  AUTODIENST: "Autodienst",
  ANDERS: "Anders",
};

export const CATEGORY_EMOJI: Record<string, string> = {};

export const shortCode = (code: string) => spacedCode(code);

import { CITIES as CITY_LIST } from "./catalog";
/** City names for filters, and centres keyed by name (plus ALL). */
export const CITIES: string[] = CITY_LIST.filter((c) => c.launched).map((c) => c.name);
export const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  ...Object.fromEntries(CITY_LIST.map((c) => [c.name, { lat: c.lat, lng: c.lng }])),
  ALL: { lat: CITY_LIST[0].lat, lng: CITY_LIST[0].lng },
};
