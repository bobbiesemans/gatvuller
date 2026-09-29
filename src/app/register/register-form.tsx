"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";
import { Notice } from "@/components/ui/notice";
import { Card, CardContent } from "@/components/ui/card";
import { LAUNCHED_CATEGORIES, LAUNCHED_CITIES } from "@/lib/catalog";
import { PASSWORD_MIN } from "@/lib/password-rules";
import { safeCallbackPath } from "@/lib/safe-path";
import { useErrorText } from "@/lib/i18n/use-error-text";
import { clientInvalid, invalidFields, useFocusFirstError } from "@/lib/form-errors";

type Role = "CUSTOMER" | "SALON_OWNER";

export function RegisterForm() {
  const t = useTranslations("ui.auth");
  const common = useTranslations("ui.common");
  const categories = useTranslations("ui.card.category");
  const errorText = useErrorText();
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = safeCallbackPath(params.get("callbackUrl"), "");
  const form = useRef<HTMLFormElement>(null);
  const [role, setRole] = useState<Role>(params.get("as") === "business" ? "SALON_OWNER" : "CUSTOMER");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, true>>({});
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  const business = role === "SALON_OWNER";
  const fieldError = (name: string) => (fields[name] ? t(`field.${name}` as never) : null);
  useFocusFirstError(form, attempt);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const missing = clientInvalid(e.currentTarget);
    setFields(missing);
    if (Object.keys(missing).length) {
      setError(t("checkFields"));
      setAttempt((n) => n + 1);
      return;
    }
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const text = (name: string) => String(fd.get(name) ?? "").trim() || undefined;
    const payload = {
      name: text("name"),
      email: text("email"),
      password: String(fd.get("password") ?? ""),
      role,
      terms: fd.get("terms") === "on",
      referralCode: params.get("ref") || undefined,
      ...(business
        ? { salonName: text("salonName"), city: text("city"), category: text("category"), address: text("address"), businessNumber: text("businessNumber") }
        : {}),
    };
    let res: Response | undefined;
    let data: { error?: string; details?: unknown } = {};
    try {
      res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      data = await res.json().catch(() => ({}));
    } catch {
      res = undefined;
    }
    if (!res?.ok) {
      const bad = invalidFields(data);
      if (bad.length) setFields(Object.fromEntries(bad.map((k) => [k, true as const])));
      if (data.error === "auth_business_number_invalid") setFields({ businessNumber: true });
      setError(bad.length ? t("checkFields") : errorText(res ? data.error : "server_error"));
      setAttempt((n) => n + 1);
      setLoading(false);
      return;
    }

    const signedIn = await signIn("credentials", { email: payload.email, password: payload.password, redirect: false }).catch(() => undefined);
    if (!signedIn || signedIn.error) {
      router.push("/login");
      return;
    }
    router.push(business ? "/dashboard" : callbackUrl || "/slots");
    router.refresh();
  }

  const cities = LAUNCHED_CITIES.map((c) => c.name).join(", ");

  return (
    <Card className="w-full max-w-lg">
      <CardContent className="space-y-5 p-6 sm:p-8">
        <div>
          <h1 className="text-2xl text-ink">{t("registerTitle")}</h1>
          <p className="mt-1 text-sm text-stone-600">{t("registerLead")}</p>
        </div>

        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-2 text-sm font-medium text-stone-700">{t("roleLegend")}</legend>
          {(["CUSTOMER", "SALON_OWNER"] as const).map((value) => (
            <label
              key={value}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 text-center text-sm font-semibold focus-within:ring-2 focus-within:ring-brand ${
                role === value ? "border-brand bg-brand-soft text-ink" : "border-stone-200 bg-white text-stone-700"
              }`}
            >
              <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
              {value === "CUSTOMER" ? t("roleCustomer") : t("roleBusiness")}
            </label>
          ))}
        </fieldset>

        <form ref={form} onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField id="name" label={t("name")} error={fieldError("name")}>
            {(c) => <Input {...c} required minLength={2} maxLength={80} autoComplete="name" />}
          </FormField>
          <FormField id="email" label={t("email")} error={fieldError("email")}>
            {(c) => <Input {...c} type="email" required maxLength={120} autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} />}
          </FormField>
          <FormField id="password" label={t("password")} hint={t("passwordRules", { min: PASSWORD_MIN })} error={fieldError("password")}>
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

          {business && (
            <fieldset className="space-y-4 rounded-xl border border-stone-200 bg-paper p-4">
              <legend className="px-1 text-sm font-semibold text-ink">{t("businessLegend")}</legend>
              <p className="text-sm text-stone-700">{t("businessReview")}</p>
              <FormField id="salonName" label={t("businessName")} error={fieldError("salonName")}>
                {(c) => <Input {...c} required minLength={2} maxLength={80} autoComplete="organization" />}
              </FormField>
              <FormField id="city" label={t("city")} hint={t("cityNote", { cities })} error={fieldError("city")}>
                {(c) => (
                  <Select {...c} required defaultValue={LAUNCHED_CITIES[0]?.name}>
                    {LAUNCHED_CITIES.map((city) => (
                      <option key={city.slug} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
              <FormField id="category" label={t("category")} error={fieldError("category")}>
                {(c) => (
                  <Select {...c} required defaultValue="">
                    <option value="" disabled>
                      {t("categoryPlaceholder")}
                    </option>
                    {LAUNCHED_CATEGORIES.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {categories(cat.key)}
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
              <FormField id="address" label={t("address")} hint={t("addressHint")} error={fieldError("address")}>
                {(c) => <Input {...c} required minLength={5} maxLength={160} autoComplete="street-address" />}
              </FormField>
              <FormField id="businessNumber" label={t("businessNumber")} hint={t("businessNumberHint")} error={fieldError("businessNumber")}>
                {(c) => <Input {...c} maxLength={30} inputMode="numeric" autoComplete="off" placeholder="0123.456.789" />}
              </FormField>
            </fieldset>
          )}

          <div className="space-y-1.5">
            <label className="flex min-h-11 items-start gap-3 text-sm text-stone-700">
              <input
                type="checkbox"
                name="terms"
                required
                aria-invalid={fields.terms ? true : undefined}
                aria-describedby={fields.terms ? "terms-error" : undefined}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#b4492b]"
              />
              <span>
                {t.rich("consent", {
                  terms: (chunks) => (
                    <Link href="/voorwaarden" target="_blank" rel="noopener" className="font-medium text-brand underline underline-offset-2">
                      {chunks}
                    </Link>
                  ),
                  privacy: (chunks) => (
                    <Link href="/privacy" target="_blank" rel="noopener" className="font-medium text-brand underline underline-offset-2">
                      {chunks}
                    </Link>
                  ),
                })}
              </span>
            </label>
            {fields.terms && (
              <p id="terms-error" className="text-sm text-red-700">
                {t("field.terms")}
              </p>
            )}
          </div>

          <div aria-live="polite">{error && <Notice tone="error">{error}</Notice>}</div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? common("loading") : business ? t("registerBusinessSubmit") : t("registerSubmit")}
          </Button>
        </form>
        <p className="border-t border-stone-200 pt-4 text-center text-sm text-stone-700">
          {t("haveAccount")}{" "}
          <Link
            href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"}
            className="inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-2"
          >
            {t("loginLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
