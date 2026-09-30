import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { expireStaleHolds } from "@/lib/bookings";
import { CATEGORY_LABELS, CITIES, discountPercent } from "@/lib/utils";
import { brusselsDayStart, brusselsHour } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { bookableSalonWhere, bookingLeadCutoff } from "@/lib/marketplace";
import { SlotsBrowse } from "@/components/slots/slots-browse";
import { FilterDrawer } from "@/components/slots/filter-drawer";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Open uren",
  description: "Kaart en lijst van last-minute afspraken. Filter op datum, tijdstip, categorie en prijs.",
  alternates: { canonical: "/slots" },
};

type SearchParams = Promise<{
  stad?: string;
  categorie?: string;
  wanneer?: string;
  dagdeel?: string;
  max?: string;
  korting?: string;
  q?: string;
}>;

export default async function SlotsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const t = await getTranslations("ui.slots");
  const me = await getCurrentUser();
  const session = me ? { user: me } : null;
  await expireStaleHolds();
  const now = new Date();
  const tomorrow = brusselsDayStart(1);
  const dayAfter = brusselsDayStart(2);
  const whenFilter =
    sp.wanneer === "vandaag"
      ? { gte: bookingLeadCutoff(now), lt: tomorrow }
      : sp.wanneer === "morgen"
        ? { gte: tomorrow, lt: dayAfter }
        : { gte: bookingLeadCutoff(now) };

  const maxEuro = Number(sp.max);
  const minDiscount = Number(sp.korting);
  const slots = await prisma.slot.findMany({
    where: {
      status: "OPEN",
      spotsLeft: { gt: 0 },
      startsAt: whenFilter,
      ...(Number.isFinite(maxEuro) && maxEuro > 0 ? { discountPrice: { lte: Math.round(maxEuro * 100) } } : {}),
      salon: {
        ...bookableSalonWhere(),
        ...(sp.stad ? { city: sp.stad } : {}),
        ...(sp.categorie ? { category: sp.categorie as never } : {}),
      },
      ...(sp.q
        ? {
            OR: [
              { title: { contains: sp.q, mode: "insensitive" as const } },
              { salon: { name: { contains: sp.q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    include: { salon: true },
    orderBy: { startsAt: "asc" },
    take: 80,
  });

  const filtered = slots.filter((slot) => {
    if (sp.dagdeel === "ochtend" && (brusselsHour(slot.startsAt) < 6 || brusselsHour(slot.startsAt) >= 12)) return false;
    if (sp.dagdeel === "middag" && (brusselsHour(slot.startsAt) < 12 || brusselsHour(slot.startsAt) >= 17)) return false;
    if (sp.dagdeel === "avond" && (brusselsHour(slot.startsAt) < 17 || brusselsHour(slot.startsAt) >= 22)) return false;
    if (Number.isFinite(minDiscount) && minDiscount > 0 && discountPercent(slot.originalPrice, slot.discountPrice) < minDiscount) return false;
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl text-ink">{t("title")}</h1>
      <p className="mt-1 text-stone-600">{t("lead")}</p>

      <FilterDrawer label="Filters" active={Boolean(sp.stad || sp.categorie || sp.wanneer || sp.dagdeel || sp.max || sp.korting || sp.q)}>
      <form className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6" action="/slots">
        <input name="q" defaultValue={sp.q || ""} placeholder={t("search")} aria-label={t("search")} className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm sm:col-span-2" />
        <select name="stad" defaultValue={sp.stad || ""} aria-label={t("city")} className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm">
          <option value="">{t("allCities")}</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select name="categorie" defaultValue={sp.categorie || ""} aria-label={t("category")} className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm">
          <option value="">{t("allCategories")}</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="wanneer" defaultValue={sp.wanneer || ""} aria-label={t("date")} className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm">
          <option value="">{t("anyDate")}</option>
          <option value="vandaag">{t("today")}</option>
          <option value="morgen">{t("tomorrow")}</option>
        </select>
        <select name="dagdeel" defaultValue={sp.dagdeel || ""} aria-label={t("part")} className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm">
          <option value="">{t("allDay")}</option>
          <option value="ochtend">{t("morning")}</option>
          <option value="middag">{t("afternoon")}</option>
          <option value="avond">{t("evening")}</option>
        </select>
        <select name="max" defaultValue={sp.max || ""} aria-label={t("maxPrice")} className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm">
          <option value="">{t("anyPrice")}</option>
          <option value="25">{t("until", { amount: 25 })}</option>
          <option value="40">{t("until", { amount: 40 })}</option>
          <option value="60">{t("until", { amount: 60 })}</option>
        </select>
        <select name="korting" defaultValue={sp.korting || ""} aria-label={t("minDiscount")} className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm">
          <option value="">{t("anyDiscount")}</option>
          <option value="20">{t("atLeast", { percent: 20 })}</option>
          <option value="30">{t("atLeast", { percent: 30 })}</option>
          <option value="40">{t("atLeast", { percent: 40 })}</option>
        </select>
        <Button type="submit" className="lg:col-span-2">{t("apply")}</Button>
      </form>
      </FilterDrawer>
      <p className="mt-3 text-sm">
        <Link href="/slots" className="underline">{t("clear")}</Link>
      </p>
      <div className="mt-6">
        <SlotsBrowse
          slots={payload}
          initialCity={sp.stad}
          favoriteSalonIds={
            session?.user
              ? (await prisma.favoriteSalon.findMany({ where: { userId: session.user.id }, select: { salonId: true } })).map((row) => row.salonId)
              : []
          }
        />
      </div>
    </div>
  );
}
