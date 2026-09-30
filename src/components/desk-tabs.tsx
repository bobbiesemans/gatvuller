import Link from "next/link";
import { cn } from "@/lib/utils";

export function DeskTabs({
  base,
  current,
  tabs,
  param = "deel",
}: {
  base: string;
  current: string;
  tabs: { id: string; label: string }[];
  param?: string;
}) {
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-[#e7dfd6] bg-white p-1" aria-label="Secties">
      {tabs.map((tab) => {
        const href = tab.id ? `${base}?${param}=${tab.id}` : base;
        const active = current === tab.id;
        return (
          <Link
            key={tab.id || "home"}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-xl px-4 py-2 text-sm font-semibold",
              active ? "bg-ink text-white" : "text-stone-600 hover:bg-paper"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
