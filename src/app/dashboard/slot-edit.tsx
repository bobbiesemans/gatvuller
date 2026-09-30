"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useErrorText } from "@/lib/i18n/use-error-text";

export function SlotEdit({
  slot,
}: {
  slot: {
    id: string;
    title: string;
    description: string | null;
    startsLocal: string;
    endsLocal: string;
    originalPrice: number;
    discountPrice: number;
    capacity: number;
  };
}) {
  const t = useTranslations("ui.desk");
  const errorText = useErrorText();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        {t("edit")}
      </Button>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(event.currentTarget);
    const res = await fetch("/api/slots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: slot.id,
        action: "edit",
        title: fd.get("title"),
        description: fd.get("description") || null,
        startsAt: fd.get("startsAt"),
        endsAt: fd.get("endsAt"),
        originalPrice: Math.round(Number(fd.get("original")) * 100),
        discountPrice: Math.round(Number(fd.get("discount")) * 100),
        capacity: Number(fd.get("capacity")),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(errorText(data.error));
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 grid gap-2 rounded-xl bg-paper p-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor={`title-${slot.id}`}>Titel</Label>
        <Input id={`title-${slot.id}`} name="title" required defaultValue={slot.title} className="mt-1" />
      </div>
      <div>
        <Label htmlFor={`start-${slot.id}`}>Start</Label>
        <Input id={`start-${slot.id}`} name="startsAt" type="datetime-local" required defaultValue={slot.startsLocal} className="mt-1" />
      </div>
      <div>
        <Label htmlFor={`end-${slot.id}`}>Einde</Label>
        <Input id={`end-${slot.id}`} name="endsAt" type="datetime-local" required defaultValue={slot.endsLocal} className="mt-1" />
      </div>
      <div>
        <Label htmlFor={`orig-${slot.id}`}>Normaal €</Label>
        <Input id={`orig-${slot.id}`} name="original" type="number" min={1} step="0.01" required defaultValue={(slot.originalPrice / 100).toFixed(2)} className="mt-1" />
      </div>
      <div>
        <Label htmlFor={`disc-${slot.id}`}>Last-minute €</Label>
        <Input id={`disc-${slot.id}`} name="discount" type="number" min={1} step="0.01" required defaultValue={(slot.discountPrice / 100).toFixed(2)} className="mt-1" />
      </div>
      <div>
        <Label htmlFor={`cap-${slot.id}`}>Plekken</Label>
        <Input id={`cap-${slot.id}`} name="capacity" type="number" min={1} max={10} required defaultValue={slot.capacity} className="mt-1" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={`desc-${slot.id}`}>Toelichting</Label>
        <Input id={`desc-${slot.id}`} name="description" defaultValue={slot.description || ""} className="mt-1" />
      </div>
      {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
      <Button type="submit" size="sm" disabled={busy} className="w-fit">{busy ? "…" : t("saveOffer")}</Button>
    </form>
  );
}
