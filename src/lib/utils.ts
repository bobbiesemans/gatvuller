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

export const CITIES = ["Antwerpen", "Brussel", "Gent", "Amsterdam"] as const;

export const PLATFORM_FEE =
  Number(process.env.PLATFORM_FEE_PERCENT || "18") || 18;
