"use client";

import { useErrorText } from "@/lib/i18n/use-error-text";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEuro } from "@/lib/utils";
import { track } from "@/lib/track";

export function BookForm({
  slotId,
  price,
  originalPrice,
  feePercent,
  cancellationHours,
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
  demoMode: boolean;
  defaultName: string;
  defaultEmail: string;
  loggedIn: boolean;
}) {
  const t = useTranslations("ui.book");
  const common = useTranslations("ui.common");
  const errorText = useErrorText();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    track("booking_started", slotId);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          customerName: fd.get("name"),
          customerEmail: fd.get("email"),
          customerPhone: fd.get("phone"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(errorText(data.error));
      if (data.url) {
        track("payment_started", slotId);
        window.location.href = data.url;
        return;
      }
      if (data.kind === "confirmed") {
        window.location.href = `/boeking/succes?bookingId=${data.bookingId}`;
        return;
      }
      throw new Error(t("noPage"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
      setLoading(false);
    }
  }

  if (!loggedIn) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-stone-600">{t("loginPrompt")}</p>
        <Button asChild className="w-full max-md:fixed max-md:bottom-20 max-md:inset-x-4 max-md:z-30 max-md:w-auto max-md:shadow-lg">
          <Link href={`/login?callbackUrl=/slots/${slotId}`}>{t("login")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <dl className="space-y-1 text-sm text-stone-700">
        <div className="flex justify-between"><dt>{t("normal")}</dt><dd>{formatEuro(originalPrice)}</dd></div>
        <div className="flex justify-between font-semibold text-ink"><dt>{t("youPay")}</dt><dd>{formatEuro(price)}</dd></div>
        <div className="flex justify-between text-stone-500"><dt>{t("fee")}</dt><dd>{feePercent}%</dd></div>
      </dl>
      <p className="text-xs text-stone-500">{t("cancelPolicy", { hours: cancellationHours })}</p>
      <div>
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" name="name" required autoComplete="name" defaultValue={defaultName} aria-invalid={error ? true : undefined} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" defaultValue={defaultEmail} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="phone">{t("phone")}</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" className="mt-1" />
      </div>
      {error && <p id="book-error" className="text-sm text-red-700" role="alert">{error}</p>}
      <Button type="submit" className="w-full max-md:fixed max-md:bottom-20 max-md:inset-x-4 max-md:z-30 max-md:w-auto max-md:shadow-lg" disabled={loading} aria-describedby={error ? "book-error" : undefined}>
        {loading ? common("loading") : t("reserve", { price: formatEuro(price) })}
      </Button>
      <p className="text-center text-xs text-stone-500">{demoMode ? t("demo") : t("stripe")}</p>
    </form>
  );
}
