"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { MapPinned, Home, Ticket, Store, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const path = usePathname() || "/";
  const t = useTranslations("ui.nav");
  const desk = useTranslations("ui.desk");
  const { data } = useSession();
  const role = data?.user?.role;
  const items = [
    { href: "/", label: t("home"), icon: Home },
    { href: "/slots", label: t("map"), icon: MapPinned },
    { href: "/boekingen", label: t("bookings"), icon: Ticket },
    role === "SALON_OWNER" || role === "ADMIN"
      ? { href: "/dashboard", label: t("dashboard"), icon: Store }
      : { href: "/account", label: desk("account"), icon: UserRound },
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-stone-200 bg-paper/95 backdrop-blur md:hidden safe-pb">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-1.5">
        {items.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-semibold transition",
                  active ? "text-brand" : "text-stone-400 hover:text-stone-600"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
