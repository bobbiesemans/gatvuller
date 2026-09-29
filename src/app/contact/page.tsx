import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { COMPANY } from "@/lib/config";
import { ContactForm } from "./contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.contact");
  return { title: t("metaTitle"), description: t("metaDesc"), alternates: { canonical: "/contact" } };
}

export default async function ContactPage() {
  const t = await getTranslations("ui.contact");
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl text-ink">{t("title")}</h1>
      <p className="mt-2 text-sm text-stone-700">{t("lead")}</p>
      <dl className="mt-4 space-y-1 text-sm text-stone-700">
        <div className="flex flex-wrap gap-x-2">
          <dt>{t("generalLabel")}</dt>
          <dd>
            <a className="font-medium text-brand underline underline-offset-2" href={`mailto:${COMPANY.email}`}>
              {COMPANY.email}
            </a>
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt>{t("privacyLabel")}</dt>
          <dd>
            <a className="font-medium text-brand underline underline-offset-2" href={`mailto:${COMPANY.privacyEmail}`}>
              {COMPANY.privacyEmail}
            </a>
          </dd>
        </div>
      </dl>
      <ContactForm email={COMPANY.email} />
    </div>
  );
}
