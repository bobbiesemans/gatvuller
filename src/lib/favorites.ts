"use client";

const KEY = "gv_favorites";

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

export function toggleFavorite(slotId: string): string[] {
  const cur = getFavorites();
  const next = cur.includes(slotId) ? cur.filter((x) => x !== slotId) : [...cur, slotId];
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("gv-favorites"));
  return next;
}

export function isFavorite(slotId: string) {
  return getFavorites().includes(slotId);
}
