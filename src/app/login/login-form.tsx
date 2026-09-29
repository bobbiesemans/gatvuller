"use client";

import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";
import { Notice } from "@/components/ui/notice";
import { Card, CardContent } from "@/components/ui/card";
import { safeCallbackPath } from "@/lib/safe-path";
import { isDemoMode } from "@/lib/config";
import { useErrorText } from "@/lib/i18n/use-error-text";
import { clientInvalid } from "@/lib/form-errors";

export function LoginForm() {
  const t = useTranslations("ui.auth");
  const common = useTranslations("ui.common");
  const errorText = useErrorText();
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = safeCallbackPath(sp.get("callbackUrl"));
  const demo = isDemoMode();
  const form = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const withCallback = (path: string) => (callbackUrl === "/" ? path : `${path}?callbackUrl=${encodeURIComponent(callbackUrl)}`);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const missing = Object.keys(clientInvalid(e.currentTarget));
    if (missing.length) {
      setError(t("checkFields"));
      form.current?.querySelector<HTMLInputElement>(`#${missing[0]}`)?.focus();
      return;
    }
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    let res: Awaited<ReturnType<typeof signIn>> | undefined;
    try {
      res = await signIn("credentials", {
        email: String(fd.get("email") ?? "").trim(),
        password: fd.get("password"),
        redirect: false,
      });
    } catch {
      res = undefined;
    }
    if (!res || res.error) {
      // Wrong password, unknown address and an unavailable account all read the same.
      setError(errorText(res?.code === "rate_limited" ? "rate_limited" : res ? "auth_invalid_credentials" : "server_error"));
      setLoading(false);
      form.current?.querySelector<HTMLInputElement>("#password")?.focus();
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-5 p-6 sm:p-8">
        <div>
          <h1 className="text-2xl text-ink">{t("loginTitle")}</h1>
          <p className="mt-1 text-sm text-stone-600">{t("loginLead")}</p>
        </div>
        <form ref={form} onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField id="email" label={t("email")}>
            {(c) => <Input {...c} type="email" required autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} maxLength={120} />}
          </FormField>
          <FormField id="password" label={t("password")} error={null}>
            {(c) => (
              <PasswordInput
                {...c}
                required
                autoComplete="current-password"
                maxLength={200}
                showLabel={t("showPassword")}
                hideLabel={t("hidePassword")}
                aria-describedby={error ? "login-error" : undefined}
                aria-invalid={error ? true : undefined}
              />
            )}
          </FormField>
          <div aria-live="polite">
            {error && (
              <div id="login-error">
                <Notice tone="error">{error}</Notice>
              </div>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? common("loading") : t("loginSubmit")}
          </Button>
          <p className="text-center text-sm">
            <Link href="/wachtwoord-vergeten" className="inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-2">
              {t("forgot")}
            </Link>
          </p>
        </form>
        <p className="border-t border-stone-200 pt-4 text-center text-sm text-stone-700">
          {t("noAccount")}{" "}
          <Link href={withCallback("/register")} className="inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-2">
            {t("registerLink")}
          </Link>
        </p>
        {demo && <Notice tone="warn">{t("demoNote")}</Notice>}
      </CardContent>
    </Card>
  );
}
