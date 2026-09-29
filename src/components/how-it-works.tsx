import { getTranslations } from "next-intl/server";
import { MapPinned, Ticket, Footprints } from "lucide-react";

export async function HowItWorks() {
  const t = await getTranslations("ui.how");
  const steps = [
    { icon: MapPinned, n: "01", title: t("s1t"), desc: t("s1d") },
    { icon: Ticket, n: "02", title: t("s2t"), desc: t("s2d") },
    { icon: Footprints, n: "03", title: t("s3t"), desc: t("s3d") },
  ];
  return (
    <section id="hoe" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">{t("kicker")}</p>
          <h2 className="mt-2 text-3xl text-ink md:text-4xl">{t("title")}</h2>
          <p className="mt-3 text-stone-600">{t("lead")}</p>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.n} className="rounded-2xl border border-stone-200 bg-paper p-6">
              <div className="flex items-center justify-between">
                <step.icon className="h-6 w-6 text-brand" />
                <span className="font-display text-stone-400">{step.n}</span>
              </div>
              <h3 className="mt-4 text-xl text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{step.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
