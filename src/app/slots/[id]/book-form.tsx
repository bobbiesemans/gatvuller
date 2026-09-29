"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { useErrorText } from "@/lib/i18n/use-error-text";
import { discountPercent, formatEuro, saveAmount } from "@/lib/money";
import { track } from "@/lib/track";

const PHONE = /^[+0-9 ().\/-]{6,30}$/;

export function BookForm({
  slotId,
  price,
  originalPrice,
  feePercent,
  cancellationHours,
  cancelDeadline,
  cancelOpen,
  holdMinutes,
  demoMode,
  defaultName,
  defaultEmail,
  loggedIn,
}: {
  slotId: string;
  price: number;
  originalPrice: number;
  feePercent: number;
  cancellationHours: number;
  /** Formatted on the server in Brussels time, in the visitor's language. */
  cancelDeadline: string;
  /** False when the free cancellation window is already over for this hour. */
  cancelOpen: boolean;
  holdMinutes: number;
  demoMode: boolean;
  defaultName: string;
  defaultEmail: string;
  loggedIn: boolean;
}) {
  const t = useTranslations("ui.book");
  const common = useTranslations("ui.common");
  const locale = useLocale();
  const errorText = useErrorText();
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ code: string | null; text: string } | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Coming back from the Stripe page with the back button restores this page from cache in its "busy" state.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        busy.current = false;
        setLoading(false);
      }
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const pct = discountPercent(originalPrice, price);
  const save = saveAmount(originalPrice, price);
  const callback = encodeURIComponent(`/slots/${slotId}`);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current) return;
    const fd = new FormData(e.currentTarget);
    const phone = String(fd.get("phone") || "").trim();
    if (phone && !PHONE.test(phone)) {
      setPhoneError(t("invalidPhone"));
      return;
    }
    setPhoneError(null);
    busy.current = true;
    setLoading(true);
    setError(null);
    track("booking_started", slotId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          customerName: fd.get("name"),
          customerEmail: fd.get("email"),
          customerPhone: phone || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = typeof data.error === "string" ? data.error : null;
        setError({ code, text: errorText(code) });
        busy.current = false;
        setLoading(false);
        return;
      }
      if (typeof data.url === "string" && data.url.startsWith("https://")) {
        track("payment_started", slotId);
        window.location.href = data.url;
        return;
      }
      if (data.kind === "confirmed" && typeof data.bookingId === "string") {
        window.location.href = `/boeking/succes?bookingId=${encodeURIComponent(data.bookingId)}`;
        return;
      }
      setError({ code: null, text: t("noPage") });
    } catch {
      setError({ code: null, text: t("networkError") });
    }
    busy.current = false;
    setLoading(false);
  }

  const overview = (
    <section aria-labelledby="price-overview">
      <h2 id="price-overview" className="sr-only">
        {t("overview")}
      </h2>
      <dl className="space-y-1.5 text-sm text-stone-700">
        <div className="flex justify-between gap-3">
          <dt>{t("normal")}</dt>
          <dd className="tabular-nums line-through">{formatEuro(originalPrice, locale)}</dd>
        </div>
        {save > 0 && (
          <div className="flex justify-between gap-3 text-emerald-800">
            <dt>{t("saving")}</dt>
            <dd className="tabular-nums">
              −{formatEuro(save, locale)} ({pct}%)
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-3 text-stone-600">
          <dt>{t("feeForYou")}</dt>
          <dd className="tabular-nums">{formatEuro(0, locale)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-stone-200 pt-2 text-base font-semibold text-ink">
          <dt>{t("youPay")}</dt>
          <dd className="tabular-nums">{formatEuro(price, locale)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-stone-500">{t("feeNote", { percent: feePercent })}</p>
    </section>
  );

  const rules = (
    <section aria-labelledby="book-rules" className="rounded-xl bg-paper p-3 text-sm text-stone-700">
      <h2 id="book-rules" className="font-sans text-sm font-semibold tracking-normal text-ink">
        {t("rulesTitle")}
      </h2>
      <ul className="mt-1.5 list-disc space-y-1 pl-5">
        <li>
          {cancelOpen
            ? t("rulesCancel", { deadline: cancelDeadline, hours: cancellationHours })
            : t("rulesNoCancel", { hours: cancellationHours })}
        </li>
        <li>{t("rulesLate")}</li>
        {!demoMode && <li>{t("rulesHold", { minutes: holdMinutes })}</li>}
      </ul>
    </section>
  );

  if (!loggedIn) {
    return (
      <div className="space-y-4">
        {overview}
        {rules}
        <div className="space-y-3 border-t border-stone-200 pt-4">
          <p className="font-semibold text-ink">{t("guestTitle")}</p>
          <p className="text-sm text-stone-600">{t("guestLead")}</p>
          <Button asChild className="w-full">
            <Link href={`/login?callbackUrl=${callback}`}>{t("login")}</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/register?callbackUrl=${callback}`}>{t("register")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-busy={loading}>
      {overview}
      {rules}
      <fieldset className="space-y-3 border-t border-stone-200 pt-4" disabled={loading}>
        <legend className="mb-1 text-sm font-semibold text-ink">{t("contactTitle")}</legend>
        <Field id="name" label={t("name")}>
          <Input id="name" name="name" required minLength={2} maxLength={80} autoComplete="name" defaultValue={defaultName} />
        </Field>
        <Field id="email" label={t("email")}>
          <Input id="email" name="email" type="email" required maxLength={120} autoComplete="email" defaultValue={defaultEmail} />
        </Field>
        <Field id="phone" label={t("phoneOptional")} hint={t("phoneHint")} error={phoneError}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            maxLength={30}
            autoComplete="tel"
            aria-invalid={phoneError ? true : undefined}
            aria-describedby={phoneError ? "phone-error" : "phone-hint"}
          />
        </Field>
      </fieldset>
      {error && (
        <div className="space-y-2">
          <Notice tone="error">{error.text}</Notice>
          {error.code === "unauthenticated" && (
            <Button asChild variant="outline" className="w-full">
              <Link href={`/login?callbackUrl=${callback}`}>{t("login")}</Link>
            </Button>
          )}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? common("loading") : t("reserve", { price: formatEuro(price, locale) })}
      </Button>
      <p className="sr-only" role="status" aria-live="polite">
        {loading ? (demoMode ? t("workingDemo") : t("working")) : ""}
      </p>
      <p className="text-center text-xs text-stone-500">{demoMode ? t("demo") : t("stripe")}</p>
      <p className="text-center text-xs text-stone-500">
        {t.rich("termsNote", {
          link: (chunks) => (
            <Link href="/voorwaarden" className="underline underline-offset-2" target="_blank">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </form>
  );
}
