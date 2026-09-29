import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("ui.system");
  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand">404</p>
      <h1 className="text-3xl text-ink">{t("notFoundTitle")}</h1>
      <p className="text-stone-700">{t("notFoundBody")}</p>
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Button asChild>
          <Link href="/slots">{t("openHours")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">{t("home")}</Link>
        </Button>
      </div>
    </div>
  );
}
