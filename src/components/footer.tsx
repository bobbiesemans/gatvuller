import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LAUNCHED_CATEGORIES, LAUNCHED_CITIES } from "@/lib/catalog";
import { COMPANY } from "@/lib/config";
import { cityLabel } from "@/lib/discovery";

const link = "inline-flex min-h-8 items-center hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded";

export async function Footer() {
  const t = await getTranslations("ui.footer");
  const card = await getTranslations("ui.card");
  const cityT = await getTranslations("ui.city");
  const heading = "text-xs font-bold uppercase tracking-wider text-stone-600";
  return (
    <footer className="mt-auto border-t border-stone-200 bg-white pb-24 lg:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-stone-700 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg text-ink">GatVuller</p>
          <p className="mt-2 max-w-sm">{t("blurb")}</p>
          <p className="mt-3 text-xs text-stone-600">© 2026 {COMPANY.legalName}</p>
        </div>
        <nav aria-labelledby="footer-explore" className="flex flex-col gap-1">
          <p id="footer-explore" className={heading}>{t("explore")}</p>
          <Link href="/slots" className={link}>{t("slots")}</Link>
          {LAUNCHED_CITIES.map((city) => (
            <Link key={city.slug} href={`/stad/${city.slug}`} className={link}>{cityLabel(cityT, city.name)}</Link>
          ))}
          <Link href="/boekingen" className={link}>{t("bookings")}</Link>
          <Link href="/favorieten" className={link}>{t("favorites")}</Link>
          <Link href="/uitnodigen" className={link}>{t("invite")}</Link>
          <Link href="/voor-zaken" className={link}>{t("forSalons")}</Link>
        </nav>
        <nav aria-labelledby="footer-categories" className="flex flex-col gap-1">
          <p id="footer-categories" className={heading}>{t("categoriesTitle")}</p>
          {LAUNCHED_CATEGORIES.map((category) => (
            <Link key={category.key} href={`/categorie/${category.slug}`} className={link}>{card(`category.${category.key}`)}</Link>
          ))}
        </nav>
        <nav aria-labelledby="footer-info" className="flex flex-col gap-1">
          <p id="footer-info" className={heading}>{t("info")}</p>
          <Link href="/voorwaarden" className={link}>{t("terms")}</Link>
          <Link href="/privacy" className={link}>{t("privacy")}</Link>
          <Link href="/contact" className={link}>{t("contact")}</Link>
          <a href={`mailto:${COMPANY.email}`} className={link}>{COMPANY.email}</a>
        </nav>
      </div>
    </footer>
  );
}
