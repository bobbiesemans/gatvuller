import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { SlotCard } from "@/components/slot-card";
import { HowItWorks } from "@/components/how-it-works";
import { Faq } from "@/components/faq";
import { CATEGORY_LABELS } from "@/lib/utils";
import { isDemoMode, PLATFORM_FEE_PERCENT } from "@/lib/config";
import { formatEuro } from "@/lib/utils";

export const dynamic = "force-dynamic";

const LAUNCH = ["KAPPER", "SCHOONHEID", "NAGELS", "MASSAGE"] as const;

export default async function HomePage() {
  const now = new Date();
  let slots: {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    originalPrice: number;
    discountPrice: number;
    spotsLeft: number;
    salon: {
      name: string;
      city: string;
      category: string;
      ratingAvg: number;
      ratingCount: number;
      address: string;
      imageUrl: string | null;
    };
  }[] = [];
  let openCount = 0;
  let paid: { amount: number; slot: { originalPrice: number } }[] = [];
  let dbError = false;
  try {
    [slots, openCount, paid] = await Promise.all([
      prisma.slot.findMany({
        where: { status: "OPEN", spotsLeft: { gt: 0 }, startsAt: { gte: now }, salon: { status: "ACTIVE" } },
        include: { salon: true },
        orderBy: { startsAt: "asc" },
        take: 24,
      }),
      prisma.slot.count({ where: { status: "OPEN", spotsLeft: { gt: 0 }, startsAt: { gte: now }, salon: { status: "ACTIVE" } } }),
      prisma.booking.findMany({
        where: { status: "PAID" },
        select: { amount: true, slot: { select: { originalPrice: true } } },
      }),
    ]);
  } catch {
    dbError = true;
  }

  const antwerp = slots.filter((s) => s.salon.city === "Antwerpen");
  const shown = [...antwerp, ...slots.filter((s) => s.salon.city !== "Antwerpen")].slice(0, 6);
  const savedCents = paid.reduce((sum, b) => sum + Math.max(0, b.slot.originalPrice - b.amount), 0);
  const maxSave = shown.reduce((max, slot) => Math.max(max, slot.originalPrice - slot.discountPrice), 0);

  return (
    <div>
      <section className="border-b border-stone-200 bg-[#f3efe8]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
          <div>
            <p className="text-sm font-semibold text-stone-500">Antwerpen · beauty en persoonlijke verzorging</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-stone-950 md:text-5xl md:leading-[1.05]">
              Lege uren worden last-minute omzet.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-stone-700">
              Kappers, schoonheidssalons, nagelstudio’s en masseurs zetten een vrij moment vandaag of morgen online.
              Jij ziet de prijs, de afstand en hoeveel je bespaart, en reserveert in een paar stappen.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/slots?stad=Antwerpen">Bekijk uren in Antwerpen</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/register">Ik heb een zaak</Link>
              </Button>
            </div>
            <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-stone-500">Open uren</dt>
                <dd className="text-2xl font-extrabold text-stone-950">{dbError ? "—" : openCount}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Hoogste korting</dt>
                <dd className="text-2xl font-extrabold text-stone-950">{maxSave > 0 ? formatEuro(maxSave) : "—"}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-lg font-bold text-stone-950">Zo werkt een boeking</h2>
            <ol className="mt-4 space-y-3 text-sm text-stone-700">
              <li>1. Kies een uur dat vandaag of morgen vrij is.</li>
              <li>2. Je ziet de normale prijs, de last-minute prijs en de annuleringstermijn.</li>
              <li>3. Je betaalt online. De plek blijft 30 minuten gereserveerd tot de betaling bevestigd is.</li>
              <li>4. Je krijgt een code en een QR-code voor bij de zaak.</li>
            </ol>
            <p className="mt-4 text-xs text-stone-500">
              Zaken betalen {PLATFORM_FEE_PERCENT}% platformkosten. Jij betaalt alleen de getoonde prijs.
              {isDemoMode() ? " Deze omgeving staat in testmodus: betalen is gesimuleerd." : ""}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-stone-950">Beschikbaar</h2>
            <p className="text-sm text-stone-600">Eerst Antwerpen. Andere steden volgen dezelfde pagina’s.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/slots">Kaart en lijst</Link>
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/stad/antwerpen" className="rounded-full bg-stone-900 px-3 py-1.5 text-sm font-semibold text-white">Antwerpen</Link>
          {LAUNCH.map((key) => (
            <Link key={key} href={`/categorie/${key.toLowerCase()}`} className="rounded-full border border-stone-200 px-3 py-1.5 text-sm text-stone-700">
              {CATEGORY_LABELS[key]}
            </Link>
          ))}
        </div>
        {dbError ? (
          <p className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-8 text-sm text-red-800">
            Het aanbod kan nu niet geladen worden. Probeer het opnieuw.
          </p>
        ) : shown.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
            <p className="font-semibold text-stone-900">Er staat nu geen uur online</p>
            <p className="mt-2 text-sm text-stone-600">Zaken publiceren een vrij moment wanneer het ontstaat.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((slot) => (
              <SlotCard
                key={slot.id}
                id={slot.id}
                title={slot.title}
                startsAt={slot.startsAt}
                endsAt={slot.endsAt}
                originalPrice={slot.originalPrice}
                discountPrice={slot.discountPrice}
                spotsLeft={slot.spotsLeft}
                salon={{
                  name: slot.salon.name,
                  city: slot.salon.city,
                  category: slot.salon.category,
                  rating: slot.salon.ratingAvg,
                  ratingCount: slot.salon.ratingCount,
                  address: slot.salon.address,
                  imageUrl: slot.salon.imageUrl,
                }}
              />
            ))}
          </div>
        )}
        {paid.length > 0 && (
          <p className="mt-6 text-sm text-stone-500">
            Klanten bespaarden samen {formatEuro(savedCents)} op {paid.length} betaalde boekingen
            {isDemoMode() ? " (inclusief testboekingen)" : ""}.
          </p>
        )}
      </section>

      <HowItWorks />
      <Faq />

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-10 md:px-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-stone-950">Een leeg uur vanmiddag?</h2>
          <p className="mt-2 max-w-xl text-stone-600">
            Zet het online met de normale prijs, de kortingsprijs en het aantal plekken. Bestaande behandelingen kan je als sjabloon hergebruiken.
          </p>
          <Button asChild className="mt-6">
            <Link href="/register">Zaak registreren</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
