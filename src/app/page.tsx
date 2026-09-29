import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { ArrowRight, MapPin, Search, ShieldCheck, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { SlotCard } from "@/components/slot-card";
import { HowItWorks } from "@/components/how-it-works";
import { Faq } from "@/components/faq";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { isDemoMode } from "@/lib/config";
import { publicSlotWhere } from "@/lib/marketplace";
import { LAUNCHED_CATEGORIES } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const t = await getTranslations("ui.home");
  const card = await getTranslations("ui.card");
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
      id: string;
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
  let dbError = false;
  try {
    [slots, openCount] = await Promise.all([
      prisma.slot.findMany({
        where: publicSlotWhere(now),
        include: { salon: true },
        orderBy: { startsAt: "asc" },
        take: 24,
      }),
      prisma.slot.count({ where: publicSlotWhere(now) }),
    ]);
  } catch {
    dbError = true;
  }

  const antwerp = slots.filter((s) => s.salon.city === "Antwerpen");
  const shown = [...antwerp, ...slots.filter((s) => s.salon.city !== "Antwerpen")].slice(0, 6);

  return (
    <div>
      <section className="overflow-hidden bg-[#efe9df]">
        <div className="mx-auto grid max-w-7xl lg:min-h-[580px] lg:grid-cols-[.95fr_1.05fr]">
          <div className="px-5 py-14 sm:px-8 lg:py-20 lg:pr-12">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#d9c9b8] bg-white/75 px-3 py-1.5 text-xs font-bold tracking-wide text-[#754d3c]">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
              {t("eyebrow")}
            </p>
            <h1 className="mt-5 max-w-[620px] font-serif text-[clamp(3rem,6vw,5.6rem)] leading-[.98] tracking-tight text-[#241f1a]">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#5c544d]">
              {t("lead")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-[#b4492b] hover:bg-[#91391f]">
                <Link href="/slots?stad=Antwerpen"><Search aria-hidden="true" className="h-4 w-4" />{t("ctaSlots")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-[#cbbcaf] bg-white/80">
                <Link href="/voor-zaken">{t("ctaSalon")}</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#62584f]">
              <span className="inline-flex items-center gap-2"><MapPin aria-hidden="true" className="h-4 w-4" />{t("availableLead")}</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck aria-hidden="true" className="h-4 w-4" />{t("priceTrust")}</span>
            </div>
          </div>
          <div className="relative h-[330px] sm:h-[420px] lg:h-full lg:min-h-[580px]">
            <Image src="/salon-hero.png" alt={t("heroAlt")} fill priority sizes="(max-width: 1024px) 100vw, 52vw" className="object-cover object-[65%_center]" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#a0462c]">{t("available")}</p>
            <h2 className="mt-2 font-serif text-3xl tracking-tight text-[#241f1a] sm:text-4xl">{t("categoryTitle")}</h2>
            <p className="mt-2 text-[#6b625a]">{t("categoryLead")}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/slots">{t("mapList")} <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          {LAUNCHED_CATEGORIES.map((category) => (
            <Link key={category.key} href={`/stad/antwerpen/${category.slug}`} className="group flex min-h-32 flex-col justify-between rounded-2xl border border-[#e5ded4] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#c58f79] hover:shadow-lg hover:shadow-[#4e281a]/5">
              <span className="text-lg font-semibold text-[#2b2621]">{card(`category.${category.key}`)}</span>
              <ArrowRight aria-hidden="true" className="h-5 w-5 text-[#a0462c] transition group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
        <div className="mt-14 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#a0462c]">{t("openSlots")}</p>
            <h2 className="mt-2 font-serif text-3xl tracking-tight text-[#241f1a] sm:text-4xl">{t("momentsTitle")}</h2>
            <p className="mt-2 text-[#6b625a]">{dbError ? t("loadError") : t("momentCount", { count: openCount })}{isDemoMode() ? ` · ${t("demoNote")}` : ""}</p>
          </div>
          <Link href="/slots" className="inline-flex items-center gap-2 text-sm font-semibold text-[#a0462c] hover:underline">{t("allMoments")} <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
        </div>
        {dbError ? (
          <Notice tone="error">{t("loadError")}</Notice>
        ) : shown.length === 0 ? (
          <EmptyState title={t("noneTitle")} body={t("noneBody")} />
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
                  id: slot.salon.id,
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
      </section>

      <HowItWorks />
      <Faq />

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="flex flex-col items-start gap-6 rounded-[2rem] bg-[#243a33] px-7 py-10 text-white md:flex-row md:items-center md:justify-between md:px-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#d8c3ae]">{t("ctaSalon")}</p>
            <h2 className="mt-2 font-serif text-3xl md:text-4xl">{t("ctaTitle")}</h2>
            <p className="mt-3 max-w-xl text-[#e2e7e1]">{t("ctaBody")}</p>
          </div>
          <Button asChild size="lg" className="bg-white text-[#243a33] hover:bg-[#f4ede3]">
            <Link href="/voor-zaken">{t("ctaRegister")} <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
