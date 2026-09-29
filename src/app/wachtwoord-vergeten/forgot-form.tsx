"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Notice } from "@/components/ui/notice";
import { Card, CardContent } from "@/components/ui/card";
import { isDemoMode } from "@/lib/config";
import { useErrorText } from "@/lib/i18n/use-error-text";
import { clientInvalid } from "@/lib/form-errors";

export function ForgotForm() {
  const t = useTranslations("ui.auth");
  const common = useTranslations("ui.common");
  const errorText = useErrorText();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const invalid = clientInvalid(e.currentTarget);
    setEmailError(Boolean(invalid.email));
    if (invalid.email) {
      e.currentTarget.querySelector<HTMLInputElement>("#email")?.focus();
      return;
    }
    setLoading(true);
    const email = String(new FormData(e.currentTarget).get("email") || "").trim();
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setSent(true);
      else setError(errorText((await res.json().catch(() => ({}))).error));
    } catch {
      setError(errorText("server_error"));
    }
    setLoading(false);
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-5 p-6 sm:p-8">
        <div>
          <h1 className="text-2xl text-ink">{t("forgotTitle")}</h1>
          {!sent && <p className="mt-1 text-sm text-stone-600">{t("forgotLead")}</p>}
        </div>
        {sent ? (
          <div className="space-y-3" role="status">
            <Notice tone="info">{t("forgotSent")}</Notice>
            {isDemoMode() && <Notice tone="warn">{t("forgotDemo")}</Notice>}
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <FormField id="email" label={t("email")} error={emailError ? t("field.email") : null}>
              {(c) => <Input {...c} type="email" required autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} maxLength={120} />}
            </FormField>
            <div aria-live="polite">{error && <Notice tone="error">{error}</Notice>}</div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? common("loading") : t("forgotSubmit")}
            </Button>
          </form>
        )}
        <p className="text-center text-sm">
          <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-2">
            {t("backToLogin")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
