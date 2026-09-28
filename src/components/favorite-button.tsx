"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  salonId,
  initial = false,
  loggedIn = true,
  className,
}: {
  salonId: string;
  initial?: boolean;
  loggedIn?: boolean;
  className?: string;
}) {
  const t = useTranslations("ui.favorites");
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (loggedIn === false) {
      window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setBusy(true);
    const next = !on;
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salonId, on: next }),
    });
    setBusy(false);
    if (res.status === 401) {
      window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (res.ok) setOn(next);
  }

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? t("remove") : t("add")}
      disabled={busy}
      onClick={toggle}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white/95 shadow-sm",
        className
      )}
    >
      <Heart className={cn("h-4 w-4", on ? "fill-brand text-brand" : "text-stone-500")} />
    </button>
  );
}
