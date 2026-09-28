"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MapPinned, Home, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/slots", label: "Kaart", icon: MapPinned },
  { href: "/boekingen", label: "Orders", icon: Ticket },
  { href: "/favorieten", label: "Favorieten", icon: Heart },
];

export function MobileNav() {
  const path = usePathname() || "/";
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden safe-pb">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-1.5">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-semibold transition",
                  active ? "text-[#b4492b]" : "text-slate-400 hover:text-slate-600"
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
