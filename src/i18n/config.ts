export const locales = ["nl", "fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "nl";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function toLocale(value: unknown): Locale {
  return isLocale(value) ? value : defaultLocale;
}

/** Path with locale prefix as served by the `as-needed` routing (Dutch has no prefix). */
export function localePath(locale: string, path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!isLocale(locale) || locale === defaultLocale) return p;
  return p === "/" ? `/${locale}` : `/${locale}${p}`;
}
