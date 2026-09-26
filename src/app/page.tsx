import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { SlotCard } from "@/components/slot-card";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, CITIES } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const slots = await prisma.slot
    .findMany({
      where: { status: "OPEN", startsAt: { gte: now } },
      include: { salon: true },
      orderBy: { startsAt: "asc" },
      take: 6,
    })
    .catch(() => []);
  const openCount = slots.length;

  return (
    <div>
      <section className="relative overflow-hidden text-white gv-gradient">
        <div className="absolute inset-0 gv-grid opacity-40" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
          <Badge className="mb-4 bg-white/20 text-white border-0">BE & NL · {openCount}+ slots</Badge>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl leading-[1.05]">
            Vul het gat.
            <span className="block text-violet-200">Boek last-minute met korting.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-violet-100/95">
            Marketplace voor last-minute afspraken. Salons vullen gaten, klanten besparen tot 50%.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-white text-violet-800 hover:bg-violet-50">
              <Link href="/slots">Bekijk last-minute slots</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10">
              <Link href="/register">Ik heb een salon</Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 flex flex-wrap gap-2">
          {CITIES.map((c) => (
            <Link key={c} href={`/slots?stad=${c}`} className="rounded-full border px-3.5 py-1.5 text-sm hover:border-violet-300 hover:bg-violet-50">
              {c}
            </Link>
          ))}
          {Object.entries(CATEGORY_LABELS).slice(0, 4).map(([k, v]) => (
            <Link key={k} href={`/slots?categorie=${k}`} className="rounded-full border px-3.5 py-1.5 text-sm text-slate-600 hover:border-violet-300">
              {v}
            </Link>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-3xl font-extrabold">Nu beschikbaar</h2>
          <Button asChild variant="secondary"><Link href="/slots">Alles</Link></Button>
        </div>
        {slots.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-12 text-center text-slate-500">Nog geen open slots.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {slots.map((s) => (
              <div key={s.id} className="gv-card-hover rounded-2xl"><SlotCard {...s} /></div>
            ))}
          </div>
        )}
      </section>
      <section className="bg-slate-950 text-white py-16">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-3xl font-extrabold">Demo: salon@gatvuller.be / klant@gatvuller.be / admin@gatvuller.be</h2>
          <p className="mt-2 text-slate-400">Wachtwoord: demo1234</p>
          <Button asChild className="mt-6"><Link href="/login">Inloggen</Link></Button>
        </div>
      </section>
    </div>
  );
}
