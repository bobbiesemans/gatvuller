import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PLATFORM_FEE_PERCENT } from "@/lib/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.business");
  return {
    title: t("title"),
    description: t("lead"),
    alternates: { canonical: "/voor-zaken" },
  };
}

export default async function ForBusinessPage() {
  const t = await getTranslations("ui.business");
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-3xl text-ink">{t("title")}</h1>
      <p className="text-stone-700">{t("lead")}</p>
      <section>
        <h2 className="text-lg text-ink">{t("feeTitle")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">{t("fee", { percent: PLATFORM_FEE_PERCENT })}</p>
      </section>
      <section>
        <h2 className="text-lg text-ink">{t("howTitle")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">{t("how")}</p>
      </section>
      <section>
        <h2 className="text-lg text-ink">{t("policyTitle")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">{t("policy")}</p>
      </section>
      <Button asChild>
        <Link href="/register">{t("cta")}</Link>
      </Button>
    </article>
  );
}
