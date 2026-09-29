"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function FavoriteSalonCard({
  salon,
  alertOn,
  email,
}: {
  salon: { id: string; name: string; city: string; slug: string };
  alertOn: boolean;
  email: string;
}) {
  const t = useTranslations("ui.favorites");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleAlert() {
    setBusy(true);
    if (alertOn) {
      await fetch(`/api/alerts?salonId=${encodeURIComponent(salon.id)}`, { method: "DELETE" });
    } else {
      await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, salonId: salon.id }),
      });
    }
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salonId: salon.id, on: false }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4">
      <div>
        <Link href={`/salon/${salon.slug}`} className="font-semibold text-ink underline-offset-2 hover:underline">{salon.name}</Link>
        <p className="text-sm text-stone-500">{salon.city}</p>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={alertOn ? "default" : "outline"} disabled={busy} onClick={toggleAlert} aria-pressed={alertOn}>
          {alertOn ? t("alertOn") : t("alertOff")}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={remove}>{t("remove")}</Button>
      </div>
    </li>
  );
}
