"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";
import { Notice } from "@/components/ui/notice";
import { Card, CardContent } from "@/components/ui/card";
import { PASSWORD_MIN } from "@/lib/password-rules";
import { useErrorText } from "@/lib/i18n/use-error-text";
import { clientInvalid, invalidFields, useFocusFirstError } from "@/lib/form-errors";

export function ResetForm() {
  const t = useTranslations("ui.auth");
  const common = useTranslations("ui.common");
  const errorText = useErrorText();
  const token = useSearchParams().get("token") || "";
  const form = useRef<HTMLFormElement>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  useFocusFirstError(form, attempt);
  const usable = token.length >= 20;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const invalid = clientInvalid(e.currentTarget);
    setPasswordError(Boolean(invalid.password));
    if (invalid.password) {
      setAttempt((n) => n + 1);
      return;
    }
    setLoading(true);
    const password = String(new FormData(e.currentTarget).get("password") || "");
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json().catch(() => ({}));
        if (invalidFields(data).includes("password")) setPasswordError(true);
        else setError(errorText(data.error));
        setAttempt((n) => n + 1);
      }
    } catch {
      setError(errorText("server_error"));
    }
    setLoading(false);
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-5 p-6 sm:p-8">
        <h1 className="text-2xl text-ink">{t("resetTitle")}</h1>
        {done ? (
          <div className="space-y-4" role="status">
            <Notice tone="info">{t("resetDone")}</Notice>
            <Button asChild className="w-full">
              <Link href="/login">{t("loginSubmit")}</Link>
            </Button>
          </div>
        ) : !usable ? (
          <div className="space-y-4">
            <Notice tone="error">{t("resetNoToken")}</Notice>
            <Button asChild className="w-full">
              <Link href="/wachtwoord-vergeten">{t("resetRequestNew")}</Link>
            </Button>
          </div>
        ) : (
          <form ref={form} onSubmit={onSubmit} noValidate className="space-y-4">
            <p className="text-sm text-stone-600">{t("resetLead")}</p>
            <FormField id="password" label={t("newPassword")} hint={t("passwordRules", { min: PASSWORD_MIN })} error={passwordError ? t("field.password") : null}>
              {(c) => (
                <PasswordInput
                  {...c}
                  required
                  minLength={PASSWORD_MIN}
                  autoComplete="new-password"
                  showLabel={t("showPassword")}
                  hideLabel={t("hidePassword")}
                />
              )}
            </FormField>
            <div aria-live="polite">
              {error && (
                <div className="space-y-3">
                  <Notice tone="error">{error}</Notice>
                  <Link href="/wachtwoord-vergeten" className="inline-flex min-h-11 items-center text-sm font-medium text-brand underline underline-offset-2">
                    {t("resetRequestNew")}
                  </Link>
                </div>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? common("loading") : t("resetSubmit")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
