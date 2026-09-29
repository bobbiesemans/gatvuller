import { getTranslations } from "next-intl/server";
import { environmentMode } from "@/lib/marketplace";

/** Test environments say so on every page; production shows nothing. */
export async function EnvironmentBanner() {
  const mode = environmentMode();
  if (mode === "live") return null;
  const t = await getTranslations("ui.env");
  const text = { demo: t("demo"), stripe_test: t("stripeTest"), unconfigured: t("unconfigured") }[mode];
  return (
    <div role="status" className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-950">
      {text}
    </div>
  );
}
