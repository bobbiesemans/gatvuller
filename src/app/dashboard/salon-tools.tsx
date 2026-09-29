"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { useErrorText } from "@/lib/i18n/use-error-text";
import { eurosToCents } from "@/lib/money";

export function CancellationForm({ salonId, hours }: { salonId: string; hours: number }) {
  const t = useTranslations("ui.dashboard.manage");
  const errorText = useErrorText();
  const router = useRouter();
  const [value, setValue] = useState(String(hours));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1 || number > 72) {
      setMessage({ tone: "error", text: errorText("invalid_input") });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/salon/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonId, cancellationHours: number }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: "error", text: errorText(data.error) });
        return;
      }
      setMessage({ tone: "info", text: t("cancelSaved") });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: errorText("generic") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <Field id={`cancel-${salonId}`} label={t("cancelLabel")} hint={t("cancelHint")}>
        <Input id={`cancel-${salonId}`} className="w-28" type="number" inputMode="numeric" min={1} max={72} value={value} onChange={(e) => setValue(e.target.value)} aria-describedby={`cancel-${salonId}-hint`} />
      </Field>
      <Button type="submit" size="sm" variant="outline" className="min-h-11" disabled={busy}>
        {busy ? t("saving") : t("cancelSave")}
      </Button>
      <div aria-live="polite">{message && <Notice tone={message.tone}>{message.text}</Notice>}</div>
    </form>
  );
}

export function TemplateForm({ salonId }: { salonId: string }) {
  const t = useTranslations("ui.dashboard.manage");
  const errorText = useErrorText();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId,
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
      form.reset();
      setMessage({ tone: "info", text: t("tplSaved") });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: errorText("generic") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-4">
      <Field id={`tpl-${salonId}`} label={t("tplTitle")} className="sm:col-span-4">
        <Input id={`tpl-${salonId}`} name="title" required minLength={2} maxLength={80} />
      </Field>
      <Field id={`dur-${salonId}`} label={t("tplMinutes")}>
        <Input id={`dur-${salonId}`} name="durationMin" type="number" inputMode="numeric" min={10} max={480} defaultValue={45} required />
      </Field>
      <Field id={`orig-${salonId}`} label={t("tplOriginal")}>
        <Input id={`orig-${salonId}`} name="original" inputMode="decimal" required />
      </Field>
      <Field id={`disc-${salonId}`} label={t("tplDiscount")}>
        <Input id={`disc-${salonId}`} name="discount" inputMode="decimal" required />
      </Field>
      <div className="flex items-end">
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? t("saving") : t("tplSave")}
        </Button>
      </div>
      <div className="sm:col-span-4" aria-live="polite">
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
      </div>
    </form>
  );
}

/** Stripe Connect: onboard, continue onboarding, or open the Express dashboard. The URL always comes from the server. */
export function PayoutButton({
  salonId,
  configured,
  action,
  label,
  primary = false,
}: {
  salonId: string;
  configured: boolean;
  action: "onboard" | "dashboard";
  label: string;
  primary?: boolean;
}) {
  const t = useTranslations("ui.dashboard.pay");
  const errorText = useErrorText();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonId, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(res.ok ? t("connectFailed") : errorText(data.error));
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(t("connectFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant={primary ? "default" : "outline"} onClick={start} disabled={loading || !configured} className="min-h-11">
        {loading ? "…" : label}
      </Button>
      <div aria-live="polite">{error && <Notice tone="error">{error}</Notice>}</div>
    </div>
  );
}
