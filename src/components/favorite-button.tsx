"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useErrorText } from "@/lib/i18n/use-error-text";

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
  const errorText = useErrorText();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toLogin() {
    const back = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/login?callbackUrl=${encodeURIComponent(back)}`;
  }

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (loggedIn === false) {
      toLogin();
      return;
    }
    setBusy(true);
    setError(null);
    const next = !on;
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonId, on: next }),
      });
      if (res.status === 401) {
        toLogin();
        return;
      }
      if (res.ok) setOn(next);
      else setError(errorText(((await res.json().catch(() => ({}))) as { error?: string }).error));
    } catch {
      setError(errorText("server_error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className={cn("inline-flex", className)}>
      <button
        type="button"
        aria-pressed={on}
        aria-label={on ? t("remove") : t("add")}
        disabled={busy}
        onClick={toggle}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white/95 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
      >
        <Heart aria-hidden="true" className={cn("h-5 w-5", on ? "fill-brand text-brand" : "text-stone-600")} />
      </button>
      <span role="status" aria-live="polite" className="sr-only">{error}</span>
    </span>
  );
}
