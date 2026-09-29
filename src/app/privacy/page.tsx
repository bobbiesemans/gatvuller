import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { COMPANY } from "@/lib/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.legal");
  return { title: t("privacyTitle"), description: t("privacyDesc"), alternates: { canonical: "/privacy" } };
}

export default async function PrivacyPage() {
  const t = await getTranslations("ui.legal");
  const vat = COMPANY.vatNumber ? `BTW ${COMPANY.vatNumber}.` : "";
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-sm leading-relaxed text-stone-700">
      <h1 className="text-3xl text-ink">{t("privacyTitle")}</h1>
      <p>{t("who", { legal: COMPANY.legalName, address: COMPANY.address, privacy: COMPANY.privacyEmail, vat })}</p>
      <h2 className="text-lg text-ink">{t("dataTitle")}</h2>
      <p>{t("data")}</p>
      <h2 className="text-lg text-ink">{t("whyTitle")}</h2>
      <p>{t("why")}</p>
      <h2 className="text-lg text-ink">{t("rightsTitle")}</h2>
      <p>{t("rights", { privacy: COMPANY.privacyEmail })}</p>
      <h2 className="text-lg text-ink">{t("processorsTitle")}</h2>
      <p>{t("processors")}</p>
    </article>
  );
}
