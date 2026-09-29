import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { COMPANY, PLATFORM_FEE_PERCENT } from "@/lib/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.legal");
  return { title: t("termsTitle"), description: t("termsDesc"), alternates: { canonical: "/voorwaarden" } };
}

export default async function TermsPage() {
  const t = await getTranslations("ui.legal");
  const company = { brand: COMPANY.brand, legal: COMPANY.legalName, address: COMPANY.address, email: COMPANY.email };
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-sm leading-relaxed text-stone-700">
      <h1 className="text-3xl text-ink">{t("termsTitle")}</h1>
      <p>{t("intro", company)}</p>
      <h2 className="text-lg text-ink">{t("offerTitle")}</h2>
      <p>{t("offer")}</p>
      <h2 className="text-lg text-ink">{t("payTitle")}</h2>
      <p>{t("pay", { percent: PLATFORM_FEE_PERCENT })}</p>
      <h2 className="text-lg text-ink">{t("cancelTitle")}</h2>
      <p>{t("cancel")}</p>
      <h2 className="text-lg text-ink">{t("reviewsTitle")}</h2>
      <p>{t("reviews")}</p>
      <h2 className="text-lg text-ink">{t("payoutTitle")}</h2>
      <p>{t("payout")}</p>
      <p>{t("contact", { email: COMPANY.email })}</p>
    </article>
  );
}
