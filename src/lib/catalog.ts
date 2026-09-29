import type { Category } from "@prisma/client";

export type City = {
  slug: string;
  /** Canonical value stored in `Salon.city`. */
  name: string;
  country: "BE" | "NL";
  lat: number;
  lng: number;
  zoom: number;
  /** Salons can register and customers see listings. Other cities show a waiting list. */
  launched: boolean;
};

export const CITIES: readonly City[] = [
  { slug: "antwerpen", name: "Antwerpen", country: "BE", lat: 51.2194, lng: 4.4025, zoom: 13, launched: true },
  { slug: "gent", name: "Gent", country: "BE", lat: 51.0543, lng: 3.7174, zoom: 13, launched: false },
  { slug: "brussel", name: "Brussel", country: "BE", lat: 50.8467, lng: 4.3525, zoom: 13, launched: false },
  { slug: "leuven", name: "Leuven", country: "BE", lat: 50.8798, lng: 4.7005, zoom: 14, launched: false },
  { slug: "mechelen", name: "Mechelen", country: "BE", lat: 51.0259, lng: 4.4776, zoom: 14, launched: false },
  { slug: "amsterdam", name: "Amsterdam", country: "NL", lat: 52.3676, lng: 4.9041, zoom: 12, launched: false },
  { slug: "rotterdam", name: "Rotterdam", country: "NL", lat: 51.9225, lng: 4.4792, zoom: 13, launched: false },
  { slug: "utrecht", name: "Utrecht", country: "NL", lat: 52.0907, lng: 5.1214, zoom: 13, launched: false },
];

export const LAUNCH_CITY = CITIES[0];

export const DEFAULT_CENTER = { lat: LAUNCH_CITY.lat, lng: LAUNCH_CITY.lng, zoom: LAUNCH_CITY.zoom };

export const LAUNCHED_CITIES = CITIES.filter((c) => c.launched);

export function cityBySlug(slug?: string | null) {
  if (!slug) return undefined;
  const s = slug.toLowerCase();
  return CITIES.find((c) => c.slug === s || c.name.toLowerCase() === s);
}

export function cityByName(name?: string | null) {
  if (!name) return undefined;
  return CITIES.find((c) => c.name === name);
}

export type CategoryMeta = {
  key: Category;
  /** Public URL segment. */
  slug: string;
  /** Older URL segments that redirect to `slug`. */
  aliases: string[];
  /** Offered at registration and in the public filters. */
  launched: boolean;
};

/** Beauty and personal care first. The rest stays in the enum for expansion and legacy rows. */
export const CATEGORIES: readonly CategoryMeta[] = [
  { key: "KAPPER", slug: "kapper", aliases: [], launched: true },
  { key: "SCHOONHEID", slug: "schoonheidssalon", aliases: ["schoonheid"], launched: true },
  { key: "NAGELS", slug: "nagelstudio", aliases: ["nagels"], launched: true },
  { key: "MASSAGE", slug: "massage", aliases: [], launched: true },
  { key: "FYSIO", slug: "fysiotherapie", aliases: ["fysio"], launched: false },
  { key: "TANDARTS", slug: "tandarts", aliases: [], launched: false },
  { key: "AUTODIENST", slug: "autodienst", aliases: [], launched: false },
  { key: "ANDERS", slug: "anders", aliases: [], launched: false },
];

export const LAUNCHED_CATEGORIES = CATEGORIES.filter((c) => c.launched);

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key) as Category[];

export function categoryMeta(key?: string | null): CategoryMeta {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function categoryBySlug(slug?: string | null) {
  if (!slug) return undefined;
  const s = slug.toLowerCase();
  return CATEGORIES.find((c) => c.slug === s || c.aliases.includes(s) || c.key.toLowerCase() === s);
}

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORY_KEYS as string[]).includes(value);
}

export function isLaunchedCategory(value: unknown): value is Category {
  return typeof value === "string" && LAUNCHED_CATEGORIES.some((c) => c.key === value);
}
