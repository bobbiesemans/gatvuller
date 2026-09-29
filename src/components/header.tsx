import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { signOut } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/ui/nav-link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { toLocale } from "@/i18n/config";
import { CalendarDays } from "lucide-react";

const linkClass = "inline-flex min-h-11 items-center hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded";
const activeClass = "text-brand";

export async function Header() {
  const me = await getCurrentUser();
  const t = await getTranslations("ui.nav");
  const locale = toLocale(await getLocale());
  return (
    <header className="sticky top-0 z-40 border-b border-[#e9e2d9] bg-paper/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded font-display text-lg tracking-tight text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:gap-2.5 sm:text-xl">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white"><CalendarDays aria-hidden="true" className="h-5 w-5" /></span>
          <span>GatVuller</span>
        </Link>
        <nav aria-label={t("primary")} className="hidden items-center gap-6 text-sm font-medium text-stone-700 lg:flex">
          <NavLink href="/slots" className={linkClass} activeClassName={activeClass}>{t("slots")}</NavLink>
          <NavLink href="/favorieten" className={linkClass} activeClassName={activeClass}>{t("favorites")}</NavLink>
          {me && <NavLink href="/boekingen" className={linkClass} activeClassName={activeClass}>{t("bookings")}</NavLink>}
          <Link href="/#hoe" className={linkClass}>{t("how")}</Link>
          {(me?.role === "SALON_OWNER" || me?.role === "ADMIN") && (
            <NavLink href="/dashboard" className={linkClass} activeClassName={activeClass}>{t("dashboard")}</NavLink>
          )}
          {me?.role === "ADMIN" && <NavLink href="/admin" className={linkClass} activeClassName={activeClass}>{t("admin")}</NavLink>}
          {!me && <NavLink href="/voor-zaken" className={linkClass} activeClassName={activeClass}>{t("forSalons")}</NavLink>}
        </nav>
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <LocaleSwitcher current={locale} label={t("language")} />
          {me ? (
            <>
              <NavLink href="/account" className="hidden min-h-11 max-w-[140px] items-center truncate text-sm text-stone-700 hover:underline sm:inline-flex lg:inline-flex" activeClassName="text-brand">
                {me.name}
              </NavLink>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="outline" className="h-11 px-3 text-sm">{t("logout")}</Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden h-11 px-3 text-sm sm:inline-flex">
                <Link href="/login">{t("login")}</Link>
              </Button>
              <Button asChild className="h-11 px-3 text-sm sm:px-5">
                <Link href="/register">{t("register")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
