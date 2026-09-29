import type { Locale } from "./config";
import nl from "../../messages/nl.json";
import fr from "../../messages/fr.json";
import en from "../../messages/en.json";
import nlDashboard from "../../messages/nl/dashboard.json";
import frDashboard from "../../messages/fr/dashboard.json";
import enDashboard from "../../messages/en/dashboard.json";
import nlCustomer from "../../messages/nl/customer.json";
import frCustomer from "../../messages/fr/customer.json";
import enCustomer from "../../messages/en/customer.json";
import nlSite from "../../messages/nl/site.json";
import frSite from "../../messages/fr/site.json";
import enSite from "../../messages/en/site.json";
import nlBooking from "../../messages/nl/booking.json";
import frBooking from "../../messages/fr/booking.json";
import enBooking from "../../messages/en/booking.json";

export type MessageTree = { [key: string]: MessageTree | string };

/**
 * One catalogue per language, assembled from the base file plus one file per area:
 * `dashboard` (salon owner screens), `customer` (discovery: home, search, city and category
 * pages, favourites, navigation), `booking` (offer page, salon page, checkout, vouchers, bookings,
 * reviews) and `site` (account, auth, admin, contact). Each area file is a partial catalogue with
 * the same shape as the base, so the same key path never lives in two files (a test checks that).
 */
export const AREA_FILES = {
  nl: { base: nl, dashboard: nlDashboard, customer: nlCustomer, booking: nlBooking, site: nlSite },
  fr: { base: fr, dashboard: frDashboard, customer: frCustomer, booking: frBooking, site: frSite },
  en: { base: en, dashboard: enDashboard, customer: enCustomer, booking: enBooking, site: enSite },
} as const satisfies Record<Locale, Record<string, unknown>>;

function isTree(value: unknown): value is MessageTree {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function mergeTrees(...trees: MessageTree[]): MessageTree {
  const out: MessageTree = {};
  for (const tree of trees) {
    for (const [key, value] of Object.entries(tree)) {
      const current = out[key];
      out[key] = isTree(value) && isTree(current) ? mergeTrees(current, value) : isTree(value) ? mergeTrees(value) : value;
    }
  }
  return out;
}

const CACHE = new Map<Locale, MessageTree>();

export function catalogFor(locale: Locale): MessageTree {
  let catalog = CACHE.get(locale);
  if (!catalog) {
    const files = AREA_FILES[locale] as Record<string, unknown>;
    catalog = mergeTrees(...Object.values(files).map((f) => f as MessageTree));
    CACHE.set(locale, catalog);
  }
  return catalog;
}
