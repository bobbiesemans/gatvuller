import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { SlotCard } from "@/components/slot-card";
import { HowItWorks } from "@/components/how-it-works";
import { Faq } from "@/components/faq";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { CATEGORY_LABELS } from "@/lib/utils";
import { isDemoMode, PLATFORM_FEE_PERCENT } from "@/lib/config";
import { formatEuro } from "@/lib/utils";
import { publicSlotWhere } from "@/lib/marketplace";
import { LAUNCHED_CATEGORIES } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const t = await getTranslations("ui.home");
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
  let paid: { amount: number; slot: { originalPrice: number } }[] = [];
  let dbError = false;
  try {
    [slots, openCount, paid] = await Promise.all([
      prisma.slot.findMany({
        where: publicSlotWhere(now),
        include: { salon: true },
        orderBy: { startsAt: "asc" },
        take: 24,
      }),
      prisma.slot.count({ where: publicSlotWhere(now) }),
      prisma.booking.findMany({
        where: { status: "PAID", paymentMode: "LIVE" },
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
            <p className="text-sm font-semibold text-stone-500">{t("eyebrow")}</p>
            <h1 className="mt-3 text-4xl text-ink md:text-5xl md:leading-[1.05]">{t("title")}</h1>
            <p className="mt-4 max-w-xl text-lg text-stone-700">{t("lead")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/slots?stad=Antwerpen&wanneer=vandaag">{t("ctaSlots")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/voor-zaken">{t("ctaSalon")}</Link>
              </Button>
            </div>
            <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-stone-500">{t("openSlots")}</dt>
                <dd className="font-display text-2xl text-ink">{dbError ? "—" : openCount}</dd>
              </div>
              <div>
                <dt className="text-stone-500">{t("topSave")}</dt>
                <dd className="font-display text-2xl text-ink">{maxSave > 0 ? formatEuro(maxSave) : "—"}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-lg text-ink">{t("howTitle")}</h2>
            <ol className="mt-4 space-y-3 text-sm text-stone-700">
              <li>1. {t("step1")}</li>
              <li>2. {t("step2")}</li>
              <li>3. {t("step3")}</li>
              <li>4. {t("step4")}</li>
            </ol>
            <p className="mt-4 text-xs text-stone-500">
              {t("feeNote", { percent: PLATFORM_FEE_PERCENT })}
              {isDemoMode() ? ` ${t("demoNote")}` : ""}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl text-ink">{t("available")}</h2>
            <p className="text-sm text-stone-600">{t("availableLead")}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/slots">{t("mapList")}</Link>
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/stad/antwerpen" className="rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-white">Antwerpen</Link>
          {LAUNCHED_CATEGORIES.map((category) => (
            <Link key={category.key} href={`/stad/antwerpen/${category.slug}`} className="rounded-full border border-stone-200 px-3 py-1.5 text-sm text-stone-700">
              {CATEGORY_LABELS[category.key]}
            </Link>
          ))}
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
        {paid.length > 0 && (
          <p className="mt-6 text-sm text-stone-500">
            {t("savedLine", { amount: formatEuro(savedCents), count: paid.length })}
            {isDemoMode() ? t("savedDemo") : ""}.
          </p>
        )}
      </section>

      <HowItWorks />
      <Faq />

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-10 md:px-10">
          <h2 className="text-2xl text-ink">{t("ctaTitle")}</h2>
          <p className="mt-2 max-w-xl text-stone-600">{t("ctaBody")}</p>
          <Button asChild className="mt-6">
            <Link href="/register">{t("ctaRegister")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
