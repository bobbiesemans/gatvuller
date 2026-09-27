import type { Category } from "@prisma/client";

export type City = {
  slug: string;
  /** Canonical value stored in `Salon.city`. */
  name: string;
  country: "BE" | "NL";
  lat: number;
  lng: number;
  zoom: number;
};

export const CITIES: readonly City[] = [
  { slug: "antwerpen", name: "Antwerpen", country: "BE", lat: 51.2194, lng: 4.4025, zoom: 13 },
  { slug: "brussel", name: "Brussel", country: "BE", lat: 50.8467, lng: 4.3525, zoom: 13 },
  { slug: "gent", name: "Gent", country: "BE", lat: 51.0543, lng: 3.7174, zoom: 13 },
  { slug: "leuven", name: "Leuven", country: "BE", lat: 50.8798, lng: 4.7005, zoom: 14 },
  { slug: "brugge", name: "Brugge", country: "BE", lat: 51.2093, lng: 3.2247, zoom: 14 },
  { slug: "amsterdam", name: "Amsterdam", country: "NL", lat: 52.3676, lng: 4.9041, zoom: 12 },
  { slug: "rotterdam", name: "Rotterdam", country: "NL", lat: 51.9225, lng: 4.4792, zoom: 13 },
  { slug: "utrecht", name: "Utrecht", country: "NL", lat: 52.0907, lng: 5.1214, zoom: 13 },
];

export const DEFAULT_CENTER = { lat: 51.05, lng: 4.4, zoom: 8 };

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
  slug: string;
  emoji: string;
  /** Tailwind gradient stops for cards and covers. */
  gradient: string;
  color: string;
};

export const CATEGORIES: readonly CategoryMeta[] = [
  { key: "KAPPER", slug: "kapper", emoji: "✂️", gradient: "from-violet-600 via-fuchsia-500 to-pink-400", color: "#7c3aed" },
  { key: "SCHOONHEID", slug: "schoonheid", emoji: "✨", gradient: "from-pink-500 via-rose-400 to-amber-300", color: "#db2777" },
  { key: "NAGELS", slug: "nagels", emoji: "💅", gradient: "from-rose-500 via-pink-500 to-fuchsia-400", color: "#e11d48" },
  { key: "MASSAGE", slug: "massage", emoji: "🧘", gradient: "from-teal-500 via-emerald-400 to-lime-300", color: "#0d9488" },
  { key: "FYSIO", slug: "fysio", emoji: "💪", gradient: "from-sky-500 via-cyan-400 to-emerald-300", color: "#0284c7" },
  { key: "TANDARTS", slug: "tandarts", emoji: "🦷", gradient: "from-blue-600 via-sky-500 to-cyan-300", color: "#2563eb" },
  { key: "AUTODIENST", slug: "autodienst", emoji: "🔧", gradient: "from-slate-700 via-slate-500 to-amber-400", color: "#475569" },
  { key: "ANDERS", slug: "anders", emoji: "⭐", gradient: "from-amber-500 via-orange-400 to-rose-400", color: "#d97706" },
];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key) as Category[];

export function categoryMeta(key?: string | null): CategoryMeta {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function categoryBySlug(slug?: string | null) {
  if (!slug) return undefined;
  const s = slug.toLowerCase();
  return CATEGORIES.find((c) => c.slug === s || c.key.toLowerCase() === s);
}

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORY_KEYS as string[]).includes(value);
}
