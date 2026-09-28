import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { toLocale } from "@/i18n/config";
import { CalendarDays } from "lucide-react";

export async function Header() {
  const session = await auth();
  const t = await getTranslations("ui.nav");
  const locale = toLocale(await getLocale());
  return (
    <header className="sticky top-0 z-40 border-b border-[#e9e2d9] bg-paper/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2.5 font-display text-xl tracking-tight text-ink">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white"><CalendarDays aria-hidden="true" className="h-5 w-5" /></span>
          <span>GatVuller</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-stone-600 lg:flex">
          <Link href="/slots" className="hover:text-brand">{t("slots")}</Link>
          <Link href="/favorieten" className="hover:text-brand">{t("favorites")}</Link>
          {session?.user && <Link href="/boekingen" className="hover:text-brand">{t("bookings")}</Link>}
          <Link href="/#hoe" className="hover:text-brand">{t("how")}</Link>
          {(session?.user?.role === "SALON_OWNER" || session?.user?.role === "ADMIN") && (
            <Link href="/dashboard" className="hover:text-brand">{t("dashboard")}</Link>
          )}
          {session?.user?.role === "ADMIN" && <Link href="/admin" className="hover:text-brand">{t("admin")}</Link>}
          {!session?.user && <Link href="/voor-zaken" className="hover:text-brand">{t("forSalons")}</Link>}
        </nav>
        <div className="flex items-center gap-2">
          <LocaleSwitcher current={locale} label={t("language")} />
          {session?.user ? (
            <>
              <Link href="/account" className="hidden max-w-[140px] truncate text-sm text-stone-600 hover:underline sm:inline">
                {session.user.name}
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="outline" size="sm">{t("logout")}</Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">{t("login")}</Link>
              </Button>
              <Button asChild size="sm" className="bg-brand hover:bg-[#91391f]">
                <Link href="/register">{t("register")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
