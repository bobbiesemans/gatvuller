import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

export async function CustomerLinks({ current }: { current: "boekingen" | "favorieten" | "account" }) {
  const t = await getTranslations("ui.desk");
  const items = [
    { id: "boekingen" as const, href: "/boekingen", label: t("customer") },
    { id: "favorieten" as const, href: "/favorieten", label: t("favorites") },
    { id: "account" as const, href: "/account", label: t("account") },
  ];
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-[#e7dfd6] bg-white p-1" aria-label="Mijn GatVuller">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          aria-current={item.id === current ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-xl px-4 py-2 text-sm font-semibold",
            item.id === current ? "bg-ink text-white" : "text-stone-600 hover:bg-paper"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
