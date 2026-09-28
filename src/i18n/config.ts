export const locales = ["nl", "fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "nl";

/** The chosen language lives in a cookie; URLs stay the same in every language. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_NAMES: Record<Locale, string> = { nl: "Nederlands", fr: "Français", en: "English" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function toLocale(value: unknown): Locale {
  return isLocale(value) ? value : defaultLocale;
}

/**
 * Link for someone who may open it on a device without the language cookie (e-mails).
 * `?lang=` is picked up by the middleware, stored in the cookie and removed from the URL.
 */
export function localizedPath(locale: string, path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!isLocale(locale) || locale === defaultLocale) return p;
  const [pathname, hash = ""] = p.split("#");
  const joiner = pathname.includes("?") ? "&" : "?";
  return `${pathname}${joiner}lang=${locale}${hash ? `#${hash}` : ""}`;
}
