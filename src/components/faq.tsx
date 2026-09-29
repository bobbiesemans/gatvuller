import { getTranslations } from "next-intl/server";
import { PLATFORM_FEE_PERCENT } from "@/lib/config";

export async function Faq() {
  const t = await getTranslations("ui.faq");
  const items = [
    { q: t("q1"), a: t("a1") },
    { q: t("q2"), a: t("a2") },
    { q: t("q3"), a: t("a3") },
    { q: t("q4"), a: t("a4", { percent: PLATFORM_FEE_PERCENT }) },
    { q: t("q5"), a: t("a5") },
    { q: t("q6"), a: t("a6") },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-3xl text-ink">{t("title")}</h2>
      <div className="mt-8 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {items.map((item) => (
          <details key={item.q} className="group px-6 py-4">
            <summary className="cursor-pointer list-none font-semibold text-ink">{item.q}</summary>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
