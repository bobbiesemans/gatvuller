"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", key: "overview", exact: true },
  { href: "/dashboard/boekingen", key: "bookings", exact: false },
  { href: "/dashboard/uitbetalingen", key: "payouts", exact: false },
  { href: "/dashboard/profiel", key: "profile", exact: false },
] as const;

/** Section tabs. They scroll sideways inside their own row on a narrow phone, never the page. */
export function DashboardNav() {
  const t = useTranslations("ui.dashboard.nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="-mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1 border-b border-stone-200">
        {ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:px-4",
                  active ? "border-brand text-brand" : "border-transparent text-stone-600 hover:text-ink"
                )}
              >
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
