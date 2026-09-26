import { prisma } from "@/lib/prisma";
import { SlotCard } from "@/components/slot-card";
import { CATEGORY_LABELS, CITIES } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Last-minute slots" };

type SP = Promise<{ stad?: string; categorie?: string; wanneer?: string; q?: string }>;

export default async function SlotsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const now = new Date();
  const salonFilter: { city?: string; category?: never } = {};
  if (sp.stad) salonFilter.city = sp.stad;
  if (sp.categorie) salonFilter.category = sp.categorie as never;

  let whenFilter: { gte: Date; lt?: Date } = { gte: now };
  if (sp.wanneer === "vandaag") {
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    whenFilter = { gte: now, lt: end };
  } else if (sp.wanneer === "morgen") {
    const start = new Date(now); start.setDate(start.getDate() + 1); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    whenFilter = { gte: start, lt: end };
  }

  const slots = await prisma.slot.findMany({
    where: {
      status: "OPEN",
      startsAt: whenFilter,
      ...(Object.keys(salonFilter).length ? { salon: salonFilter } : {}),
      ...(sp.q ? { OR: [
        { title: { contains: sp.q, mode: "insensitive" } },
        { salon: { name: { contains: sp.q, mode: "insensitive" } } },
      ] } : {}),
    },
    include: { salon: true },
    orderBy: { startsAt: "asc" },
    take: 60,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">Last-minute slots</h1>
      <p className="mt-1 text-slate-500">Vandaag of morgen · met korting · instant boeken</p>
      <form className="mt-6 flex flex-wrap gap-2" action="/slots" method="get">
        <input name="q" defaultValue={sp.q || ""} placeholder="Zoek salon of behandeling…" className="h-11 flex-1 min-w-[200px] rounded-xl border border-slate-200 px-3 text-sm" />
        <select name="stad" defaultValue={sp.stad || ""} className="h-11 rounded-xl border border-slate-200 px-3 text-sm">
          <option value="">Alle steden</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select name="categorie" defaultValue={sp.categorie || ""} className="h-11 rounded-xl border border-slate-200 px-3 text-sm">
          <option value="">Alle categorieën</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="wanneer" defaultValue={sp.wanneer || ""} className="h-11 rounded-xl border border-slate-200 px-3 text-sm">
          <option value="">Vandaag + morgen</option>
          <option value="vandaag">Vandaag</option>
          <option value="morgen">Morgen</option>
        </select>
        <Button type="submit">Filter</Button>
      </form>
      <p className="mt-6 text-sm text-slate-500">{slots.length} slots gevonden</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((s) => <SlotCard key={s.id} {...s} />)}
      </div>
      {slots.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed p-10 text-center text-slate-500">Geen slots voor deze filters.</div>
      )}
      <div className="mt-6"><Link href="/" className="text-violet-700 text-sm font-semibold">← Home</Link></div>
    </div>
  );
}
