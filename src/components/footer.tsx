import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CITIES } from "@/lib/catalog";
import { COMPANY } from "@/lib/config";

export async function Footer() {
  const t = await getTranslations("ui.footer");
  return (
    <footer className="mt-auto border-t border-stone-200 bg-white pb-24 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-stone-600 md:grid-cols-3">
        <div>
          <p className="font-display text-lg text-ink">GatVuller</p>
          <p className="mt-2 max-w-sm">{t("blurb")}</p>
          <p className="mt-3 text-xs text-stone-400">© 2026 {COMPANY.legalName}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/slots" className="hover:text-ink">{t("slots")}</Link>
          <Link href="/stad/antwerpen" className="hover:text-ink">Antwerpen</Link>
          <Link href="/boekingen" className="hover:text-ink">{t("bookings")}</Link>
          <Link href="/favorieten" className="hover:text-ink">{t("favorites")}</Link>
          <Link href="/uitnodigen" className="hover:text-ink">{t("invite")}</Link>
          <Link href="/voor-zaken" className="hover:text-ink">{t("forBusiness")}</Link>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/voorwaarden" className="hover:text-ink">{t("terms")}</Link>
          <Link href="/privacy" className="hover:text-ink">{t("privacy")}</Link>
          <Link href="/contact" className="hover:text-ink">{t("contact")}</Link>
          <a href={`mailto:${COMPANY.email}`} className="hover:text-ink">{COMPANY.email}</a>
          <div className="mt-2 flex flex-wrap gap-2">
            {CITIES.slice(0, 4).map((city) => (
              <Link key={city.slug} href={`/stad/${city.slug}`} className="rounded-full border border-stone-200 px-2 py-0.5 text-xs">
                {city.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
