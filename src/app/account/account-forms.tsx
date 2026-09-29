"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";
import { Notice } from "@/components/ui/notice";
import { PASSWORD_MIN } from "@/lib/password-rules";
import { useErrorText } from "@/lib/i18n/use-error-text";
import { clientInvalid, invalidFields, useFocusFirstError } from "@/lib/form-errors";
import { setLocale } from "@/i18n/actions";
import { LOCALE_NAMES, locales } from "@/i18n/config";

type Result = { tone: "info" | "error"; text: string } | null;

export function SignOutButton() {
  const t = useTranslations("ui.account");
  return (
    <Button type="button" variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
      {t("signOut")}
    </Button>
  );
}

export function ProfileForm({ name, phone, locale, marketingOptIn }: { name: string; phone: string; locale: string; marketingOptIn: boolean }) {
  const t = useTranslations("ui.account");
  const common = useTranslations("ui.common");
  const errorText = useErrorText();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState<Result>(null);
  const [fields, setFields] = useState<Record<string, true>>({});
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  useFocusFirstError(form, attempt);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    const missing = clientInvalid(e.currentTarget);
    setFields(missing);
    if (Object.keys(missing).length) {
      setAttempt((n) => n + 1);
      return;
    }
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const chosen = String(fd.get("locale"));
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fd.get("name"), phone: fd.get("phone"), locale: chosen, marketingOptIn: fd.get("marketingOptIn") === "on" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult({ tone: "info", text: common("saved") });
        // The site follows the chosen language as well as the e-mails.
        await setLocale(chosen);
        router.refresh();
      } else {
        const bad = invalidFields(data);
        setFields(Object.fromEntries(bad.map((k) => [k, true as const])));
        setResult({ tone: "error", text: errorText(data.error) });
        setAttempt((n) => n + 1);
      }
    } catch {
      setResult({ tone: "error", text: errorText("server_error") });
    }
    setBusy(false);
  }

  return (
    <form ref={form} onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField id="name" label={t("name")} error={fields.name ? t("nameError") : null}>
        {(c) => <Input {...c} defaultValue={name} required minLength={2} maxLength={80} autoComplete="name" />}
      </FormField>
      <FormField id="phone" label={t("phone")} hint={t("phoneHint")} error={fields.phone ? t("phoneError") : null}>
        {(c) => <Input {...c} defaultValue={phone} type="tel" maxLength={30} autoComplete="tel" inputMode="tel" />}
      </FormField>
      <FormField id="locale" label={t("language")} hint={t("languageHint")}>
        {(c) => (
          <Select {...c} defaultValue={locale}>
            {locales.map((l) => (
              <option key={l} value={l} lang={l}>
                {LOCALE_NAMES[l]}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <div>
        <label className="flex min-h-11 items-start gap-3 text-sm text-stone-700">
          <input
            type="checkbox"
            name="marketingOptIn"
            defaultChecked={marketingOptIn}
            aria-describedby="marketing-hint"
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#b4492b]"
          />
          <span>
            <span className="font-medium text-ink">{t("marketing")}</span>
            <span id="marketing-hint" className="mt-0.5 block text-xs text-stone-600">
              {t("marketingHint")}
            </span>
          </span>
        </label>
      </div>
      <div aria-live="polite">{result && <Notice tone={result.tone}>{result.text}</Notice>}</div>
      <Button type="submit" disabled={busy}>
        {busy ? common("loading") : common("save")}
      </Button>
    </form>
  );
}

export function PasswordForm({ email }: { email: string }) {
  const t = useTranslations("ui.account");
  const auth = useTranslations("ui.auth");
  const common = useTranslations("ui.common");
  const errorText = useErrorText();
  const form = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState<Result>(null);
  const [fields, setFields] = useState<Record<string, true>>({});
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  useFocusFirstError(form, attempt);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    const formEl = e.currentTarget;
    const missing = clientInvalid(formEl);
    const fd = new FormData(formEl);
    const next = String(fd.get("next") ?? "");
    const current = String(fd.get("current") ?? "");
    setFields(missing);
    if (Object.keys(missing).length) {
      setAttempt((n) => n + 1);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        formEl.reset();
        // The old session ends with the old password: sign in again here with the new one.
        await signIn("credentials", { email, password: next, redirect: false }).catch(() => undefined);
        setResult({ tone: "info", text: t("passwordChanged") });
      } else {
        const bad = invalidFields(data);
        setFields(data.error === "auth_password_wrong" ? { current: true } : Object.fromEntries(bad.map((k) => [k, true as const])));
        setResult({ tone: "error", text: errorText(data.error) });
        setAttempt((n) => n + 1);
      }
    } catch {
      setResult({ tone: "error", text: errorText("server_error") });
    }
    setBusy(false);
  }

  return (
    <form ref={form} onSubmit={onSubmit} noValidate className="space-y-4">
      <p className="text-sm text-stone-600">{t("passwordLead")}</p>
      <FormField id="current" label={t("currentPassword")} error={fields.current ? auth("field.password") : null}>
        {(c) => <PasswordInput {...c} required autoComplete="current-password" maxLength={200} showLabel={auth("showPassword")} hideLabel={auth("hidePassword")} />}
      </FormField>
      <FormField id="next" label={t("newPassword")} hint={auth("passwordRules", { min: PASSWORD_MIN })} error={fields.next ? auth("field.password") : null}>
        {(c) => <PasswordInput {...c} required minLength={PASSWORD_MIN} autoComplete="new-password" showLabel={auth("showPassword")} hideLabel={auth("hidePassword")} />}
      </FormField>
      <div aria-live="polite">{result && <Notice tone={result.tone}>{result.text}</Notice>}</div>
      <Button type="submit" variant="outline" disabled={busy}>
        {busy ? common("loading") : t("changePassword")}
      </Button>
    </form>
  );
}

export function DeleteAccount() {
  const t = useTranslations("ui.account");
  const common = useTranslations("ui.common");
  const errorText = useErrorText();
  const [open, setOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        // Fixed confirmation token of the API; the person confirms with the checkbox below.
        body: JSON.stringify({ confirm: "VERWIJDER" }),
      });
      if (res.ok) {
        await signOut({ callbackUrl: "/" });
        return;
      }
      setError(errorText((await res.json().catch(() => ({}))).error));
    } catch {
      setError(errorText("server_error"));
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {t("erasureStart")}
      </Button>
    );
  }
  return (
    <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4" role="group" aria-labelledby="erasure-confirm-title">
      <p id="erasure-confirm-title" className="font-semibold text-red-900">
        {t("erasureConfirmTitle")}
      </p>
      <label className="flex min-h-11 items-start gap-3 text-red-900">
        <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-red-700" />
        <span>{t("erasureUnderstood")}</span>
      </label>
      <div aria-live="polite">{error && <Notice tone="error">{error}</Notice>}</div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="danger" disabled={!understood || busy} onClick={remove}>
          {busy ? common("loading") : t("erasureConfirm")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setUnderstood(false);
            setError(null);
          }}
        >
          {t("erasureCancel")}
        </Button>
      </div>
    </div>
  );
}
