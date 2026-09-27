import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CITIES as CITY_LIST, DEFAULT_CENTER } from "./catalog";
import { PLATFORM_FEE_PERCENT } from "./config";
import { intlLocale } from "./time";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEuro(cents: number, locale = "nl") {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatNumber(n: number, locale = "nl") {
  return new Intl.NumberFormat(intlLocale(locale)).format(n);
}

export function discountPercent(original: number, discounted: number) {
  if (original <= 0) return 0;
  return Math.max(0, Math.round(((original - discounted) / original) * 100));
}

export function saveAmount(original: number, discounted: number) {
  return Math.max(0, original - discounted);
}

export function platformFee(amount: number, percent = PLATFORM_FEE_PERCENT) {
  return Math.round((amount * percent) / 100);
}

/** Haversine distance in km */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function formatDistance(km: number | null | undefined) {
  if (km == null || Number.isNaN(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function slugify(s: string, max = 48) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, max);
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

export function shortCode(code: string) {
  return code.length > 8 ? code.slice(-8).toUpperCase() : code.toUpperCase();
}

// Legacy exports kept until every page reads labels from the translation catalog.
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

/** Cities with live supply; the catalog lists upcoming launch cities too. */
export const CITIES = ["Antwerpen", "Brussel", "Gent", "Amsterdam"] as const;

export const CITY_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  ...Object.fromEntries(CITY_LIST.map((c) => [c.name, { lat: c.lat, lng: c.lng, zoom: c.zoom }])),
  ALL: DEFAULT_CENTER,
};

export const PLATFORM_FEE = PLATFORM_FEE_PERCENT;
