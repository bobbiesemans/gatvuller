"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { InlineConfirm } from "@/components/dashboard/inline-confirm";
import { useErrorText } from "@/lib/i18n/use-error-text";
import { eurosToCents, formatEuro } from "@/lib/money";

type Message = { tone: "info" | "error"; text: string } | null;

const textarea =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";

export function ProfileForm({
  salon,
}: {
  salon: { id: string; name: string; description: string; phone: string | null; website: string | null; address: string; postalCode: string | null };
}) {
  const t = useTranslations("ui.dashboard.manage");
  const errorText = useErrorText();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const fd = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const res = await fetch("/api/salon/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId: salon.id,
          name: fd.get("name"),
          description: fd.get("description"),
          phone: fd.get("phone"),
          website: fd.get("website"),
          address: fd.get("address"),
          postalCode: fd.get("postalCode"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: "error", text: errorText(data.error) });
        return;
      }
      setMessage({ tone: "info", text: t("profileSaved") });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: errorText("generic") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field id={`name-${salon.id}`} label={t("name")}>
        <Input id={`name-${salon.id}`} name="name" required minLength={2} maxLength={80} defaultValue={salon.name} />
      </Field>
      <Field id={`desc-${salon.id}`} label={t("description")}>
        <textarea id={`desc-${salon.id}`} name="description" required minLength={10} maxLength={800} rows={4} defaultValue={salon.description} className={textarea} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`phone-${salon.id}`} label={t("phone")}>
          <Input id={`phone-${salon.id}`} name="phone" type="tel" maxLength={30} defaultValue={salon.phone || ""} />
        </Field>
        <Field id={`web-${salon.id}`} label={t("website")} hint={t("websiteHint")}>
          <Input id={`web-${salon.id}`} name="website" type="url" inputMode="url" maxLength={160} defaultValue={salon.website || ""} aria-describedby={`web-${salon.id}-hint`} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field id={`addr-${salon.id}`} label={t("address")}>
          <Input id={`addr-${salon.id}`} name="address" required minLength={5} maxLength={160} defaultValue={salon.address} />
        </Field>
        <Field id={`pc-${salon.id}`} label={t("postalCode")}>
          <Input id={`pc-${salon.id}`} name="postalCode" maxLength={12} defaultValue={salon.postalCode || ""} />
        </Field>
      </div>
      <div aria-live="polite">{message && <Notice tone={message.tone}>{message.text}</Notice>}</div>
      <Button type="submit" className="w-full sm:w-fit" disabled={busy}>
        {busy ? t("saving") : t("saveProfile")}
      </Button>
    </form>
  );
}

export function PhotoForm({ salonId, enabled, count }: { salonId: string; enabled: boolean; count: number }) {
  const t = useTranslations("ui.dashboard");
  const errorText = useErrorText();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  if (!enabled) return <Notice>{t("photosOff")}</Notice>;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage(null);
    const body = new FormData(form);
    body.set("salonId", salonId);
    setBusy(true);
    try {
      const res = await fetch("/api/salon/photos", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: "error", text: errorText(data.error) });
        return;
      }
      form.reset();
      setMessage({ tone: "info", text: t("manage.photoSaved") });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: errorText("generic") });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-sm text-stone-600">{t("manage.photoCount", { count, max: 8 })}</p>
      <div className="flex flex-wrap items-end gap-3">
        <Field id={`photo-${salonId}`} label={t("manage.photoFile")} hint={t("manage.photoHint")} className="min-w-0 flex-1 basis-64">
          <Input id={`photo-${salonId}`} name="file" type="file" accept="image/jpeg,image/png,image/webp" required aria-describedby={`photo-${salonId}-hint`} className="h-auto py-2" />
        </Field>
        <Button type="submit" disabled={busy || count >= 8} variant="outline" className="w-full sm:w-auto">
          {busy ? t("manage.saving") : t("manage.photoUpload")}
        </Button>
      </div>
      <div aria-live="polite">{message && <Notice tone={message.tone}>{message.text}</Notice>}</div>
    </form>
  );
}

export function LocationForm({ categories, defaultCity }: { categories: { key: string; label: string }[]; defaultCity: string }) {
  const t = useTranslations("ui.dashboard.manage");
  const errorText = useErrorText();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch("/api/salon/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          city: fd.get("city"),
          category: fd.get("category"),
          address: fd.get("address"),
          businessNumber: fd.get("businessNumber") || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: "error", text: errorText(data.error) });
        return;
      }
      form.reset();
      setMessage({ tone: "info", text: t("locCreated") });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: errorText("generic") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field id="loc-name" label={t("locName")} className="sm:col-span-2">
        <Input id="loc-name" name="name" required minLength={2} maxLength={80} />
      </Field>
      <Field id="loc-city" label={t("locCity")}>
        <Input id="loc-city" name="city" required maxLength={40} defaultValue={defaultCity} />
      </Field>
      <Field id="loc-cat" label={t("locCategory")}>
        <Select id="loc-cat" name="category" defaultValue={categories[0]?.key}>
          {categories.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="loc-address" label={t("locAddress")} className="sm:col-span-2">
        <Input id="loc-address" name="address" required minLength={5} maxLength={160} />
      </Field>
      <Field id="loc-kbo" label={t("locKbo")}>
        <Input id="loc-kbo" name="businessNumber" maxLength={20} />
      </Field>
      <div className="sm:col-span-2" aria-live="polite">
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
      </div>
      <Button type="submit" className="w-full sm:w-fit" disabled={busy}>
        {busy ? t("saving") : t("locAdd")}
      </Button>
    </form>
  );
}

export function TemplateItem({
  template,
}: {
  template: { id: string; salonId: string; title: string; durationMin: number; originalPrice: number; discountPrice: number };
}) {
  const t = useTranslations("ui.dashboard.manage");
  const errorText = useErrorText();
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const original = eurosToCents(String(fd.get("original") ?? ""));
    const discount = eurosToCents(String(fd.get("discount") ?? ""));
    if (original === null || discount === null) {
      setMessage({ tone: "error", text: errorText("invalid_input") });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/salon/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: template.id,
          salonId: template.salonId,
          title: String(fd.get("title") ?? "").trim(),
          durationMin: Number(fd.get("durationMin")),
          originalPrice: original,
          discountPrice: discount,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: "error", text: errorText(data.error) });
        return;
      }
      setOpen(false);
      setMessage({ tone: "info", text: t("tplSaved") });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: errorText("generic") });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/salon/templates?id=${encodeURIComponent(template.id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: "error", text: errorText(data.error) });
        return;
      }
      setRemoving(false);
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: errorText("generic") });
    } finally {
      setBusy(false);
    }
  }

  const id = template.id;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-ink">{t("tplLine", { title: template.title, minutes: template.durationMin, price: formatEuro(template.discountPrice, locale) })}</p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" className="min-h-11" aria-expanded={open} disabled={busy} onClick={() => { setOpen((v) => !v); setRemoving(false); }}>
            {open ? t("tplCancel") : t("tplEdit")}
          </Button>
          <Button type="button" size="sm" variant="ghost" className="min-h-11" disabled={busy || removing} onClick={() => { setRemoving(true); setOpen(false); }}>
            {t("tplRemove")}
          </Button>
        </div>
      </div>
      {removing && <InlineConfirm message={t("tplRemoveConfirm")} yes={t("tplRemove")} no={t("tplCancel")} busy={busy} onYes={remove} onNo={() => setRemoving(false)} />}
      {open && (
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-4">
          <Field id={`t-title-${id}`} label={t("tplTitle")} className="sm:col-span-4">
            <Input id={`t-title-${id}`} name="title" defaultValue={template.title} required minLength={2} maxLength={80} />
          </Field>
          <Field id={`t-dur-${id}`} label={t("tplMinutes")}>
            <Input id={`t-dur-${id}`} name="durationMin" type="number" inputMode="numeric" min={10} max={480} defaultValue={template.durationMin} required />
          </Field>
          <Field id={`t-orig-${id}`} label={t("tplOriginal")}>
            <Input id={`t-orig-${id}`} name="original" inputMode="decimal" defaultValue={String(template.originalPrice / 100).replace(".", ",")} required />
          </Field>
          <Field id={`t-disc-${id}`} label={t("tplDiscount")}>
            <Input id={`t-disc-${id}`} name="discount" inputMode="decimal" defaultValue={String(template.discountPrice / 100).replace(".", ",")} required />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? t("saving") : t("tplSave")}
            </Button>
          </div>
        </form>
      )}
      <div aria-live="polite">{message && <Notice tone={message.tone}>{message.text}</Notice>}</div>
    </div>
  );
}
