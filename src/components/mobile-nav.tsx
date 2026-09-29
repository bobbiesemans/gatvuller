"use client";

import { useTranslations } from "next-intl";
import { Heart, Home, LayoutDashboard, MapPinned, ShieldCheck, Store, Ticket, UserRound, LogIn } from "lucide-react";
import { NavLink } from "@/components/ui/nav-link";
import { cn } from "@/lib/utils";

type Role = "CUSTOMER" | "SALON_OWNER" | "ADMIN" | null;

/** Bottom bar below 1024px: at most five items, chosen by role. Logging out and the language live in the header. */
export function MobileNav({ role }: { role: Role }) {
  const t = useTranslations("ui.nav");
  const home = { href: "/", label: t("home"), icon: Home, exact: true };
  const slots = { href: "/slots", label: t("slots"), icon: MapPinned };
  const bookings = { href: "/boekingen", label: t("bookingsShort"), icon: Ticket };
  const favorites = { href: "/favorieten", label: t("favorites"), icon: Heart };
  const account = { href: "/account", label: t("account"), icon: UserRound };

  const items =
    role === "ADMIN"
      ? [home, slots, { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard }, { href: "/admin", label: t("admin"), icon: ShieldCheck }, account]
      : role === "SALON_OWNER"
        ? [home, slots, { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard }, bookings, account]
        : role === "CUSTOMER"
          ? [home, slots, bookings, favorites, account]
          : [
              home,
              slots,
              favorites,
              { href: "/voor-zaken", label: t("forSalons"), icon: Store },
              { href: "/login", label: t("login"), icon: LogIn },
            ];

  return (
    <nav aria-label={t("bottom")} className="safe-pb fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-paper/95 backdrop-blur lg:hidden">
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around px-1 py-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <NavLink
                href={item.href}
                exact={"exact" in item ? item.exact : false}
                className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-center text-[11px] font-semibold leading-tight text-stone-600 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none"
                activeClassName="text-brand"
              >
                <Icon aria-hidden="true" className={cn("h-5 w-5 shrink-0")} />
                <span className="max-w-full break-words">{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
