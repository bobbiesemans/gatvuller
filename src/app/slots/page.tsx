import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS, CITIES } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SlotsBrowse } from "@/components/slots/slots-browse";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Surprise slots — kaart & lijst" };

type SearchParams = Promise<{
  stad?: string;
  categorie?: string;
  wanneer?: string;
  q?: string;
}>;

export default async function SlotsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const now = new Date();
  const tomorrowEnd = new Date(now);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 2);
  tomorrowEnd.setHours(0, 0, 0, 0);

  const whenFilter =
    sp.wanneer === "vandaag"
      ? { gte: now, lt: new Date(new Date(now).setHours(23, 59, 59, 999)) }
      : sp.wanneer === "morgen"
        ? {
            gte: new Date(new Date(now).setHours(24, 0, 0, 0)),
            lt: tomorrowEnd,
          }
        : { gte: now };

  const salonFilter: { city?: string; category?: string } = {};
  if (sp.stad) salonFilter.city = sp.stad;
  if (sp.categorie) salonFilter.category = sp.categorie;

  const slots = await prisma.slot.findMany({
    where: {
      status: "OPEN",
      startsAt: whenFilter,
      ...(Object.keys(salonFilter).length ? { salon: salonFilter } : {}),
      ...(sp.q
        ? {
            OR: [
              { title: { contains: sp.q, mode: "insensitive" } },
              { salon: { name: { contains: sp.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { salon: true },
    orderBy: { startsAt: "asc" },
    take: 80,
  });

  const payload = slots.map((s) => ({
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
      rating: s.salon.rating,
      address: s.salon.address,
      lat: s.salon.lat,
      lng: s.salon.lng,
      imageUrl: s.salon.imageUrl,
    },
  }));

  const mk = (key: string, val?: string) => {
    const p = new URLSearchParams();
    if (sp.stad && key !== "stad") p.set("stad", sp.stad);
    if (sp.categorie && key !== "categorie") p.set("categorie", sp.categorie);
    if (sp.wanneer && key !== "wanneer") p.set("wanneer", sp.wanneer);
    if (sp.q) p.set("q", sp.q);
    if (val) p.set(key, val);
    const qs = p.toString();
    return qs ? `/slots?${qs}` : "/slots";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">Surprise slots</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Last-minute in jouw buurt
          </h1>
          <p className="mt-1 text-slate-500">
            Kaart + lijst · afstand · korting · countdown — Too Good To Go voor afspraken
          </p>
        </div>
      </div>

      <form className="mt-6 flex flex-wrap gap-2" action="/slots" method="get">
        <input
          name="q"
          defaultValue={sp.q || ""}
          placeholder="Zoek salon, stad of behandeling…"
          className="h-11 flex-1 min-w-[200px] rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
        />
        <select name="stad" defaultValue={sp.stad || ""} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm">
          <option value="">Alle steden</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          name="categorie"
          defaultValue={sp.categorie || ""}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
        >
          <option value="">Alle categorieën</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          name="wanneer"
          defaultValue={sp.wanneer || ""}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
        >
          <option value="">Vandaag + morgen</option>
          <option value="vandaag">Vandaag</option>
          <option value="morgen">Morgen</option>
        </select>
        <Button type="submit">Filter</Button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Link href="/slots" className="rounded-full bg-slate-100 px-3 py-1.5 font-medium hover:bg-violet-100">
          Reset
        </Link>
        {CITIES.map((c) => (
          <Link
            key={c}
            href={mk("stad", c)}
            className={`rounded-full px-3 py-1.5 font-medium ${
              sp.stad === c ? "bg-violet-600 text-white" : "bg-slate-100 hover:bg-violet-100"
            }`}
          >
            {c}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <SlotsBrowse slots={payload} initialCity={sp.stad} />
      </div>
    </div>
  );
}
