import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cityBySlug } from "@/lib/catalog";
import { SlotCard } from "@/components/slot-card";
import { CATEGORY_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const city = cityBySlug((await params).slug);
  if (!city) return { title: "Stad" };
  const title = `Last-minute afspraken in ${city.name}`;
  const description = `Vrije uren met korting bij kappers, schoonheidssalons en masseurs in ${city.name}.`;
  return { title, description, alternates: { canonical: `/stad/${city.slug}` }, openGraph: { title, description } };
}

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const city = cityBySlug((await params).slug);
  if (!city) notFound();
  const slots = await prisma.slot.findMany({
    where: {
      status: "OPEN",
      spotsLeft: { gt: 0 },
      startsAt: { gte: new Date() },
      salon: { status: "ACTIVE", city: city.name },
    },
    include: { salon: true },
    orderBy: { startsAt: "asc" },
    take: 48,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm font-semibold uppercase tracking-wider text-stone-500">{city.country === "BE" ? "België" : "Nederland"}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-950">Last-minute in {city.name}</h1>
      <p className="mt-2 max-w-2xl text-stone-600">
        GatVuller toont alleen uren die een zaak zelf heeft gepubliceerd. {city.name === "Antwerpen" ? "Antwerpen is de eerste stad waar we beauty en persoonlijke verzorging uitbouwen." : "Het aanbod groeit stad per stad."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {Object.entries(CATEGORY_LABELS).slice(0, 4).map(([key, label]) => (
          <Link key={key} href={`/slots?stad=${city.name}&categorie=${key}`} className="rounded-full border border-stone-200 px-3 py-1 hover:bg-stone-50">
            {label}
          </Link>
        ))}
      </div>
      {slots.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center">
          <p className="font-semibold text-stone-900">Nog geen open uren in {city.name}</p>
          <p className="mt-2 text-sm text-stone-600">Zaken publiceren last-minute. Bekijk intussen het volledige aanbod.</p>
          <Link href="/slots" className="mt-4 inline-block text-sm font-semibold underline">Alle open uren</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot) => (
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
                imageUrl: slot.salon.imageUrl,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
