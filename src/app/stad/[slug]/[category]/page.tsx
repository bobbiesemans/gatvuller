import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { categoryBySlug, cityBySlug } from "@/lib/catalog";
import { CATEGORY_LABELS } from "@/lib/utils";
import { SlotCard } from "@/components/slot-card";
import { EmptyState } from "@/components/ui/empty-state";
import { bookableSalonWhere } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; category: string }> }): Promise<Metadata> {
  const { slug, category } = await params;
  const city = cityBySlug(slug);
  const cat = categoryBySlug(category);
  if (!city || !cat) return { title: "GatVuller" };
  const title = `${CATEGORY_LABELS[cat.key]} in ${city.name}`;
  const description = `Last-minute ${CATEGORY_LABELS[cat.key].toLowerCase()} in ${city.name}. Alleen uren die een zaak zelf publiceert.`;
  return {
    title,
    description,
    alternates: { canonical: `/stad/${city.slug}/${cat.slug}` },
    openGraph: { title, description, url: `/stad/${city.slug}/${cat.slug}` },
  };
}

export default async function CityCategoryPage({ params }: { params: Promise<{ slug: string; category: string }> }) {
  const { slug, category } = await params;
  const city = cityBySlug(slug);
  const cat = categoryBySlug(category);
  if (!city || !cat) notFound();
  if (category !== cat.slug) notFound();
  const t = await getTranslations("ui.city");
  const slots = await prisma.slot.findMany({
    where: {
      status: "OPEN",
      spotsLeft: { gt: 0 },
      startsAt: { gte: new Date() },
      salon: { ...bookableSalonWhere(), city: city.name, category: cat.key },
    },
    include: { salon: true },
    orderBy: { startsAt: "asc" },
    take: 48,
  });
  const label = CATEGORY_LABELS[cat.key];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm text-stone-500">
        <Link href={`/stad/${city.slug}`} className="underline">{city.name}</Link>
        {" · "}
        <Link href={`/categorie/${cat.slug}`} className="underline">{label}</Link>
      </p>
      <h1 className="mt-2 text-3xl text-ink">{label} in {city.name}</h1>
      <p className="mt-2 max-w-2xl text-stone-600">{t("emptyBody")}</p>
      {slots.length === 0 ? (
        <EmptyState
          className="mt-8"
          title={t("empty", { city: city.name })}
          body={t("emptyBody")}
          action={<Link href="/slots" className="text-sm font-semibold underline">{t("all")}</Link>}
        />
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
                id: slot.salon.id,
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
