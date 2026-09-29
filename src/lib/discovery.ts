import { prisma } from "./prisma";
import { publicSlotWhere } from "./marketplace";
import { brusselsDayStart } from "./time";
import { discountPercent } from "./money";
import { cityByName } from "./catalog";

type Translator = { (key: string, values?: Record<string, string | number>): string; has(key: string): boolean };

/** City name in the visitor's language ("Anvers" in French). `t` is the `ui.city` translator; unknown cities keep their stored name. */
export function cityLabel(t: unknown, name: string) {
  const tr = t as Translator;
  const slug = cityByName(name)?.slug;
  return slug && tr.has(`name.${slug}`) ? tr(`name.${slug}`) : name;
}

export type HomeSummary = {
  today: number;
  tomorrow: number;
  lowestPrice: number | null;
  topDiscount: number | null;
};

/** Facts about the offers that can be booked right now. Only real rows; nothing is estimated. */
export async function homeSummary(now = new Date()): Promise<HomeSummary> {
  const rows = await prisma.slot.findMany({
    where: publicSlotWhere(now),
    select: { startsAt: true, originalPrice: true, discountPrice: true },
    orderBy: { startsAt: "asc" },
    take: 500,
  });
  const tomorrowStart = brusselsDayStart(1, now);
  const dayAfter = brusselsDayStart(2, now);
  let today = 0;
  let tomorrow = 0;
  let lowestPrice: number | null = null;
  let topDiscount: number | null = null;
  for (const row of rows) {
    if (row.startsAt < tomorrowStart) today += 1;
    else if (row.startsAt < dayAfter) tomorrow += 1;
    if (lowestPrice === null || row.discountPrice < lowestPrice) lowestPrice = row.discountPrice;
    const pct = discountPercent(row.originalPrice, row.discountPrice);
    if (pct > 0 && (topDiscount === null || pct > topDiscount)) topDiscount = pct;
  }
  return { today, tomorrow, lowestPrice, topDiscount };
}

/** Salons this account saved, so hearts on cards show the right state. */
export async function favoriteSalonIdsFor(userId: string | undefined | null): Promise<string[]> {
  if (!userId) return [];
  const rows = await prisma.favoriteSalon.findMany({ where: { userId }, select: { salonId: true }, take: 500 });
  return rows.map((row) => row.salonId);
}

/** Sentence above the alert form, fitted to what the alert covers. `t` is the `ui.alerts` translator. */
export function alertBody(t: unknown, scope: { city?: string; category?: string; salon?: string }) {
  const tr = t as (key: string, values?: Record<string, string | number>) => string;
  if (scope.salon) return tr("bodySalon", { salon: scope.salon });
  if (scope.city && scope.category) return tr("bodyCityCategory", { city: scope.city, category: scope.category });
  if (scope.city) return tr("bodyCity", { city: scope.city });
  if (scope.category) return tr("bodyCategory", { category: scope.category });
  return tr("bodyAny");
}
