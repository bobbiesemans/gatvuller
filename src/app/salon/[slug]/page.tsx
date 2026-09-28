import { jsonLd as jsonLdScript } from "@/lib/json-ld";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SlotCard } from "@/components/slot-card";
import { CATEGORY_LABELS } from "@/lib/utils";
import { categoryBySlug } from "@/lib/catalog";
import { MiniMap } from "@/components/map/mini-map";
import { appUrl, isDemoMode, PLATFORM_FEE_PERCENT } from "@/lib/config";

export const dynamic = "force-dynamic";

const DAY = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];

function clock(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({ where: { slug }, select: { name: true, city: true, category: true, description: true } });
  if (!salon) return { title: "Zaak" };
  const title = `${salon.name} in ${salon.city}`;
  return {
    title,
    description: salon.description,
    alternates: { canonical: `/salon/${slug}` },
    openGraph: { title, description: salon.description, url: `/salon/${slug}` },
  };
}

export default async function SalonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    include: {
      hours: { orderBy: { weekday: "asc" } },
      reviews: {
        where: { hidden: false },
        orderBy: { createdAt: "desc" },
        take: 12,
        include: { customer: { select: { name: true } } },
      },
      slots: {
        where: { status: "OPEN", spotsLeft: { gt: 0 }, startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 12,
      },
    },
  });
  if (!salon || salon.status !== "ACTIVE" || (salon.isDemo && !isDemoMode())) notFound();
  const cat = categoryBySlug(salon.category.toLowerCase());
  const schemaTypes: Record<string, string> = { KAPPER: "HairSalon", SCHOONHEID: "BeautySalon", NAGELS: "NailSalon", MASSAGE: "DaySpa" };
  const schemaType = schemaTypes[salon.category] || "HealthAndBeautyBusiness";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: salon.name,
    description: salon.description,
    address: { "@type": "PostalAddress", streetAddress: salon.address, addressLocality: salon.city, addressCountry: salon.country },
    url: `${appUrl()}/salon/${salon.slug}`,
    ...(salon.ratingCount > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: salon.ratingAvg, reviewCount: salon.ratingCount } }
      : {}),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <p className="text-sm text-stone-500">
        <Link href={`/stad/${salon.city.toLowerCase()}`} className="underline">{salon.city}</Link>
        {" · "}
        <Link href={`/categorie/${cat?.slug || "anders"}`} className="underline">{CATEGORY_LABELS[salon.category]}</Link>
      </p>
      <div className="mt-3 grid gap-8 md:grid-cols-5">
        <div className="md:col-span-3 space-y-6">
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
            {salon.imageUrl ? (
              <div
                role="img"
                aria-label={salon.name}
                className="h-56 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${JSON.stringify(salon.imageUrl)})` }}
              />
            ) : (
              <div className="flex h-40 items-end bg-stone-200 px-5 py-4 text-stone-700">
                <span className="text-sm">Nog geen foto geüpload</span>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-950">{salon.name}</h1>
            <p className="mt-2 text-stone-600">{salon.description}</p>
            <p className="mt-3 text-sm leading-relaxed text-stone-700">
              {salon.verified ? "Geverifieerde zaak" : "Verificatie nog niet afgerond"} ·{" "}
              {salon.ratingCount > 0 ? `${salon.ratingAvg.toFixed(1)} uit ${salon.ratingCount} beoordelingen na een bezoek` : "Nog geen beoordelingen"}
            </p>
          </div>
          <section>
            <h2 className="text-lg font-bold">Vrije uren</h2>
            {salon.slots.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-stone-300 px-4 py-8 text-sm text-stone-600">
                Er staat nu geen last-minute uur online. Bewaar de zaak en kom later terug.
              </p>
            ) : (
              <div className="mt-3 grid gap-4">
                {salon.slots.map((slot) => (
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
                      name: salon.name,
                      city: salon.city,
                      category: salon.category,
                      rating: salon.ratingAvg,
                      ratingCount: salon.ratingCount,
                      address: salon.address,
                      imageUrl: salon.imageUrl,
                    }}
                  />
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="text-lg font-bold">Beoordelingen</h2>
            <p className="mt-1 text-sm text-stone-500">Alleen klanten met een uitgevoerde boeking kunnen een beoordeling plaatsen.</p>
            {salon.reviews.length === 0 ? (
              <p className="mt-3 text-sm text-stone-600">Nog geen beoordelingen.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {salon.reviews.map((review) => (
                  <li key={review.id} className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
                    <p className="font-semibold">{review.customer.name} · {review.rating}/5</p>
                    {review.comment && <p className="mt-1 text-stone-600">{review.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <aside className="md:col-span-2 space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-700">
            <h2 className="font-bold text-stone-950">Adres</h2>
            <p className="mt-2">{salon.address}</p>
            <p>{salon.postalCode} {salon.city}</p>
            {salon.phone && <p className="mt-2">{salon.phone}</p>}
            <MiniMap lat={salon.lat} lng={salon.lng} label={salon.name} className="mt-4 h-48 w-full overflow-hidden rounded-xl border border-stone-200" />
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-700">
            <h2 className="font-bold text-stone-950">Openingstijden</h2>
            {salon.hours.length === 0 ? (
              <p className="mt-2">Nog niet ingevuld door de zaak.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
                  const row = salon.hours.find((h) => h.weekday === weekday);
                  return (
                    <li key={weekday} className="flex justify-between capitalize">
                      <span>{DAY[weekday]}</span>
                      <span>{!row || row.closed ? "gesloten" : `${clock(row.openMin)}–${clock(row.closeMin)}`}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-700 space-y-2">
            <h2 className="font-bold text-stone-950">Voorwaarden van dit uur</h2>
            <p>Annuleren kan tot {salon.cancellationHours} uur voor de start. Daarna volgt geen terugbetaling.</p>
            <p>Niet komen opdagen telt als no-show: het bedrag blijft betaald.</p>
            <p>Platformkosten: {PLATFORM_FEE_PERCENT}% van de last-minute prijs, betaald door de zaak. De prijs op de kaart is het bedrag dat jij betaalt.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
