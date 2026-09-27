import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { categoryBySlug } from "@/lib/catalog";
import { SlotCard } from "@/components/slot-card";
import { CITIES } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const category = categoryBySlug((await params).slug);
  if (!category) return { title: "Categorie" };
  const title = `Last-minute ${category.slug} afspraken`;
  const description = `Vrije uren met korting bij lokale ${category.slug}zaken. Eerst in Antwerpen, daarna andere steden.`;
  return { title, description, alternates: { canonical: `/categorie/${category.slug}` } };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const category = categoryBySlug((await params).slug);
  if (!category) notFound();
  const slots = await prisma.slot.findMany({
    where: {
      status: "OPEN",
      spotsLeft: { gt: 0 },
      startsAt: { gte: new Date() },
      salon: { status: "ACTIVE", category: category.key },
    },
    include: { salon: true },
    orderBy: { startsAt: "asc" },
    take: 48,
  });
  const label = category.slug.charAt(0).toUpperCase() + category.slug.slice(1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-stone-950">{label}, last-minute</h1>
      <p className="mt-2 max-w-2xl text-stone-600">
        Alleen echte vrije uren. De korting en het aantal plekken komen uit de publicatie van de zaak.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {CITIES.map((city) => (
          <Link key={city} href={`/slots?stad=${city}&categorie=${category.key}`} className="rounded-full border border-stone-200 px-3 py-1">
            {city}
          </Link>
        ))}
      </div>
      {slots.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center text-stone-600">
          Geen open uren in deze categorie. <Link href="/slots" className="font-semibold underline">Bekijk alles</Link>
        </p>
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
