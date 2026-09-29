import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { expireStaleHolds } from "@/lib/bookings";
import { discountPercent } from "@/lib/utils";
import { brusselsDayStart, brusselsHour } from "@/lib/time";
import { bookableSalonWhere, bookingLeadCutoff } from "@/lib/marketplace";
import { LAUNCHED_CATEGORIES, LAUNCHED_CITIES, cityByName, isCategory } from "@/lib/catalog";
import { alertBody, cityLabel, favoriteSalonIdsFor } from "@/lib/discovery";
import { SlotsBrowse } from "@/components/slots/slots-browse";
import { SlotFilters, type FilterValues } from "@/components/slots/slot-filters";
import { AlertSignup } from "@/components/slots/alert-signup";
import { Notice } from "@/components/ui/notice";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.slots");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/slots" },
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
const pick = (value: string, allowed: string[]) => (allowed.includes(value) ? value : "");

export default async function SlotsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const t = await getTranslations("ui.slots");
  const alertsT = await getTranslations("ui.alerts");
  const cityT = await getTranslations("ui.city");
  const cardT = await getTranslations("ui.card");
  const me = await getCurrentUser();

  // Only known values reach the query; anything else is ignored instead of failing.
  const stad = cityByName(one(sp.stad).trim())?.name ?? "";
  const categorie = isCategory(one(sp.categorie)) ? one(sp.categorie) : "";
  const values: FilterValues = {
    q: one(sp.q).trim().slice(0, 100),
    stad,
    categorie,
    wanneer: pick(one(sp.wanneer), ["vandaag", "morgen"]),
    dagdeel: pick(one(sp.dagdeel), ["ochtend", "middag", "avond"]),
    max: pick(one(sp.max), ["25", "40", "60"]),
    korting: pick(one(sp.korting), ["20", "30", "40"]),
    sorteer: pick(one(sp.sorteer), ["afstand"]),
  };
  const alertState = pick(one(sp.alert), ["aan", "uit", "ongeldig"]);

  const now = new Date();
  const tomorrow = brusselsDayStart(1);
  const dayAfter = brusselsDayStart(2);
  const whenFilter =
    values.wanneer === "vandaag"
      ? { gte: bookingLeadCutoff(now), lt: tomorrow }
      : values.wanneer === "morgen"
        ? { gte: tomorrow, lt: dayAfter }
        : { gte: bookingLeadCutoff(now) };
  const maxEuro = Number(values.max);
  const minDiscount = Number(values.korting);

  let loadFailed = false;
  let slots: Awaited<ReturnType<typeof loadSlots>> = [];
  let favoriteIds: string[] = [];
  async function loadSlots() {
    await expireStaleHolds();
    return prisma.slot.findMany({
      where: {
        status: "OPEN",
        spotsLeft: { gt: 0 },
        startsAt: whenFilter,
        ...(maxEuro > 0 ? { discountPrice: { lte: Math.round(maxEuro * 100) } } : {}),
        salon: {
          ...bookableSalonWhere(),
          ...(stad ? { city: stad } : {}),
          ...(categorie ? { category: categorie as never } : {}),
        },
        ...(values.q
          ? {
              OR: [
                { title: { contains: values.q, mode: "insensitive" as const } },
                { salon: { name: { contains: values.q, mode: "insensitive" as const } } },
              ],
            }
          : {}),
      },
      include: { salon: true },
      orderBy: { startsAt: "asc" },
      take: 80,
    });
  }
  try {
    [slots, favoriteIds] = await Promise.all([loadSlots(), favoriteSalonIdsFor(me?.id)]);
  } catch {
    loadFailed = true;
  }

  const filtered = slots.filter((slot) => {
    const hour = brusselsHour(slot.startsAt);
    if (values.dagdeel === "ochtend" && (hour < 6 || hour >= 12)) return false;
    if (values.dagdeel === "middag" && (hour < 12 || hour >= 17)) return false;
    if (values.dagdeel === "avond" && (hour < 17 || hour >= 22)) return false;
    if (minDiscount > 0 && discountPercent(slot.originalPrice, slot.discountPrice) < minDiscount) return false;
    return true;
  });

  const payload = filtered.map((s) => ({
    id: s.id,
    title: s.title,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    originalPrice: s.originalPrice,
    discountPrice: s.discountPrice,
    spotsLeft: s.spotsLeft,
    salon: {
      id: s.salon.id,
      name: s.salon.name,
      city: s.salon.city,
      category: s.salon.category,
      rating: s.salon.ratingAvg,
      ratingCount: s.salon.ratingCount,
      address: s.salon.address,
      lat: s.salon.lat,
      lng: s.salon.lng,
      imageUrl: s.salon.imageUrl,
    },
  }));

  const hasFilters = Boolean(values.q || values.stad || values.categorie || values.wanneer || values.dagdeel || values.max || values.korting);
  const alertScope = {
    city: stad ? cityLabel(cityT, stad) : undefined,
    category: categorie ? cardT(`category.${categorie}`) : undefined,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <h1 className="text-2xl text-ink sm:text-3xl">{t("title")}</h1>
      <p className="mt-1 hidden text-stone-600 sm:block">{t("lead")}</p>

      {alertState && (
        <div className="mt-4">
          <Notice tone={alertState === "ongeldig" ? "warn" : "info"}>
            {alertState === "aan" ? alertsT("confirmed") : alertState === "uit" ? alertsT("off") : alertsT("invalid")}
          </Notice>
        </div>
      )}

      <SlotFilters
        values={values}
        cities={LAUNCHED_CITIES.map((c) => ({ value: c.name, label: cityLabel(cityT, c.name) }))}
        categories={LAUNCHED_CATEGORIES.map((c) => ({ value: c.key, label: cardT(`category.${c.key}`) }))}
      />

      <div className="mt-5">
        {loadFailed ? (
          <Notice tone="error">{t("loadError")}</Notice>
        ) : (
          <SlotsBrowse
            slots={payload}
            initialCity={stad || undefined}
            initialSort={values.sorteer === "afstand" ? "distance" : "time"}
            hasFilters={hasFilters}
            favoriteSalonIds={favoriteIds}
            emptyExtra={
              <AlertSignup
                body={alertBody(alertsT, alertScope)}
                city={stad || null}
                category={categorie || null}
                signedInEmail={me?.email ?? null}
              />
            }
          />
        )}
      </div>
    </div>
  );
}
