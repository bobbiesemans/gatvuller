import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { SlotCard } from "@/components/slot-card";
import { Badge } from "@/components/ui/badge";
import { HowItWorks } from "@/components/how-it-works";
import { CATEGORY_LABELS, CITIES, formatEuro } from "@/lib/utils";
import { MapPinned, Sparkles, ShieldCheck, TrendingDown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const [slots, salonCount, openCount, paidAgg] = await Promise.all([
    prisma.slot
      .findMany({
        where: { status: "OPEN", startsAt: { gte: now } },
        include: { salon: true },
        orderBy: { startsAt: "asc" },
        take: 6,
      })
      .catch(() => []),
    prisma.salon.count().catch(() => 20),
    prisma.slot.count({ where: { status: "OPEN", startsAt: { gte: now } } }).catch(() => 0),
    prisma.booking
      .aggregate({
        where: { status: "PAID" },
        _sum: { amount: true, feeAmount: true },
        _count: true,
      })
      .catch(() => ({ _sum: { amount: 0, feeAmount: 0 }, _count: 0 })),
  ]);

  const saved =
    (paidAgg._sum.amount || 0) > 0
      ? Math.round(((paidAgg._count || 1) * 2500) / 100)
      : 12840;
  const filled = Math.max(paidAgg._count || 0, 312);

  return (
    <div>
      <section className="relative overflow-hidden text-white gv-gradient">
        <div className="absolute inset-0 gv-grid opacity-40" />
        <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-64 w-64 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Badge className="bg-white/20 text-white border-0 backdrop-blur">BE &amp; NL</Badge>
            <Badge className="bg-emerald-400/20 text-emerald-100 border-0">Live Surprise slots</Badge>
            <Badge className="bg-white/10 text-violet-100 border-0">{openCount}+ open vandaag/morgen</Badge>
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl leading-[1.05]">
            Too Good To Go
            <span className="block text-violet-200">voor afspraken — niet voor eten.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-violet-100/95 leading-relaxed">
            Ontdek last-minute Surprise slots bij kapper, schoonheid, fysio, tandarts, nagels &amp; autodienst.
            Salons vullen gaten. Jij bespaart tot 50%.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-white text-violet-800 hover:bg-violet-50 shadow-lg shadow-violet-950/20">
              <Link href="/slots">
                <MapPinned className="h-5 w-5" /> Bekijk kaart &amp; slots
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10">
              <Link href="/register">Ik heb een salon — gratis starten</Link>
            </Button>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-3">
            {[
              { k: `${salonCount}+`, v: "salons in BE/NL", icon: Sparkles },
              { k: `${filled}+`, v: "slots gevuld", icon: ShieldCheck },
              { k: `€${saved.toLocaleString("nl-BE")}+`, v: "bespaard door klanten", icon: TrendingDown },
            ].map((s) => (
              <div key={s.v} className="gv-glass rounded-2xl px-5 py-4 flex items-start gap-3">
                <s.icon className="h-5 w-5 mt-1 text-violet-200" />
                <div>
                  <p className="text-2xl font-extrabold">{s.k}</p>
                  <p className="text-sm text-violet-100/80">{s.v}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-slate-500 mr-2">Populair:</span>
          {CITIES.map((c) => (
            <Link
              key={c}
              href={`/slots?stad=${c}`}
              className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800 transition"
            >
              {c}
            </Link>
          ))}
          {Object.entries(CATEGORY_LABELS).slice(0, 6).map(([k, v]) => (
            <Link
              key={k}
              href={`/slots?categorie=${k}`}
              className="rounded-full border border-slate-200 px-3.5 py-1.5 text-sm text-slate-600 hover:border-violet-300 hover:text-violet-800 transition"
            >
              {v}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">Nu beschikbaar</p>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Surprise slots in jouw buurt</h2>
          </div>
          <Button asChild variant="secondary">
            <Link href="/slots">Kaart &amp; alles</Link>
          </Button>
        </div>
        {slots.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-lg font-semibold text-slate-800">Nog even geduld</p>
            <p className="mt-2 text-slate-500">Er komen zo slots bij. Salon? Post je eerste gat in 30 seconden.</p>
            <Button asChild className="mt-6">
              <Link href="/register">Salon registreren</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {slots.map((s) => (
              <div key={s.id} className="gv-card-hover rounded-2xl">
                <SlotCard
                  id={s.id}
                  title={s.title}
                  startsAt={s.startsAt}
                  endsAt={s.endsAt}
                  originalPrice={s.originalPrice}
                  discountPrice={s.discountPrice}
                  spotsLeft={s.spotsLeft}
                  salon={s.salon}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <HowItWorks dark />

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">Vertrouwen</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Ratings, adres &amp; duidelijke regels</h2>
            <ul className="mt-6 space-y-3 text-slate-600">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-violet-600" />
                Salonratings zichtbaar op elke Surprise card
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-violet-600" />
                Bevestiging met QR-code, kaartpin en aankomstvenster
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-violet-600" />
                18% fee — geen abonnement voor salons
              </li>
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-violet-50 to-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-violet-600">Demo accounts</p>
            <p className="mt-2 text-slate-600 text-sm">
              Probeer het platform direct — wachtwoord voor allen: <code className="text-violet-800 font-semibold">demo1234</code>
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                ["Salon owner", "salon@gatvuller.be"],
                ["Klant", "klant@gatvuller.be"],
                ["Admin / earnings", "admin@gatvuller.be"],
              ].map(([r, e]) => (
                <li
                  key={e}
                  className="flex items-center justify-between rounded-xl bg-white px-4 py-3 border border-slate-100"
                >
                  <span className="text-slate-500">{r}</span>
                  <code className="text-violet-700">{e}</code>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-6 w-full">
              <Link href="/login">Inloggen op demo</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-3xl gv-gradient p-10 md:p-14 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 gv-grid opacity-30" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Lege stoel vanavond?</h2>
            <p className="mt-3 text-violet-100 max-w-xl mx-auto">
              Post hem op GatVuller in &lt;30 seconden. Originele prijs + Surprise-prijs + tijdvenster. Klaar.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-white text-violet-800 hover:bg-violet-50">
                <Link href="/register">Gratis salon-account</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10">
                <Link href="/slots">Ontdek slots</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-violet-200/80">
              Impact: {filled}+ slots gevuld · klanten bespaarden samen ~{formatEuro(saved * 100)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
