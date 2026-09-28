import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { expireStaleHolds } from "@/lib/bookings";
import { CATEGORY_LABELS, CITIES, discountPercent } from "@/lib/utils";
import { brusselsDayStart, brusselsHour } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { bookableSalonWhere, bookingLeadCutoff } from "@/lib/marketplace";
import { SlotsBrowse } from "@/components/slots/slots-browse";

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
      <h1 className="text-3xl font-extrabold tracking-tight text-stone-950">Open uren</h1>
      <p className="mt-1 text-stone-600">Kaart of lijst. Tijden in België en Nederland. Alleen uren die nu echt vrij zijn.</p>

      <form className="mt-6 grid gap-2 sm:grid-cols-3 lg:grid-cols-6" action="/slots">
        <input name="q" defaultValue={sp.q || ""} placeholder="Zaak of behandeling" aria-label="Zoeken" className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm sm:col-span-2" />
        <select name="stad" defaultValue={sp.stad || ""} aria-label="Stad" className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm">
          <option value="">Alle steden</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select name="categorie" defaultValue={sp.categorie || ""} aria-label="Categorie" className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm">
          <option value="">Alle categorieën</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="wanneer" defaultValue={sp.wanneer || ""} aria-label="Datum" className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm">
          <option value="">Alle datums</option>
          <option value="vandaag">Vandaag</option>
          <option value="morgen">Morgen</option>
        </select>
        <select name="dagdeel" defaultValue={sp.dagdeel || ""} aria-label="Tijdstip" className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm">
          <option value="">Hele dag</option>
          <option value="ochtend">Ochtend</option>
          <option value="middag">Middag</option>
          <option value="avond">Avond</option>
        </select>
        <select name="max" defaultValue={sp.max || ""} aria-label="Maximumprijs" className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm">
          <option value="">Elke prijs</option>
          <option value="25">Tot €25</option>
          <option value="40">Tot €40</option>
          <option value="60">Tot €60</option>
        </select>
        <select name="korting" defaultValue={sp.korting || ""} aria-label="Minimale korting" className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm">
          <option value="">Elke korting</option>
          <option value="20">Minstens 20%</option>
          <option value="30">Minstens 30%</option>
          <option value="40">Minstens 40%</option>
        </select>
        <Button type="submit" className="lg:col-span-2">Toon uren</Button>
      </form>
      <p className="mt-3 text-sm">
        <Link href="/slots" className="underline">Filters wissen</Link>
      </p>
      <div className="mt-6">
        <SlotsBrowse slots={payload} initialCity={sp.stad} />
      </div>
    </div>
  );
}
