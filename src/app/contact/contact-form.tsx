"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Notice } from "@/components/ui/notice";
import { useErrorText } from "@/lib/i18n/use-error-text";
import { clientInvalid, invalidFields, useFocusFirstError } from "@/lib/form-errors";

const TOPICS = ["booking", "business", "privacy", "other"] as const;

type Status = { tone: "info" | "warn" | "error"; text: string } | null;

export function ContactForm({ email: contactEmail }: { email: string }) {
  const t = useTranslations("ui.contact");
  const common = useTranslations("ui.common");
  const errorText = useErrorText();
  const form = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>(null);
  const [fields, setFields] = useState<Record<string, true>>({});
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  useFocusFirstError(form, attempt);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setStatus(null);
    const missing = clientInvalid(formEl);
    setFields(missing);
    if (Object.keys(missing).length) {
      setStatus({ tone: "error", text: t("checkFields") });
      setAttempt((n) => n + 1);
      return;
    }
    setLoading(true);
    const fd = new FormData(formEl);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fd.get("name"), email: fd.get("email"), topic: fd.get("topic"), message: fd.get("message") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const bad = invalidFields(data);
        setFields(Object.fromEntries(bad.map((k) => [k, true as const])));
        setStatus({ tone: "error", text: bad.length ? t("checkFields") : data.error === "contact_failed" ? t("failed", { email: contactEmail }) : errorText(data.error) });
        setAttempt((n) => n + 1);
      } else {
        setStatus(
          data.delivered
            ? { tone: "info", text: t("sent") }
            : // No mail provider: the message only sits in the test outbox and nobody has read it.
              { tone: "warn", text: t("storedTest", { email: contactEmail }) }
        );
        formEl.reset();
      }
    } catch {
      setStatus({ tone: "error", text: errorText("server_error") });
    }
    setLoading(false);
  }

  return (
    <form ref={form} onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
      <FormField id="name" label={t("name")} error={fields.name ? t("field.name") : null}>
        {(c) => <Input {...c} required minLength={2} maxLength={80} autoComplete="name" />}
      </FormField>
      <FormField id="email" label={t("email")} error={fields.email ? t("field.email") : null}>
        {(c) => <Input {...c} type="email" required maxLength={120} autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} />}
      </FormField>
      <FormField id="topic" label={t("topic")} error={fields.topic ? t("field.topic") : null}>
        {(c) => (
          <Select {...c} required defaultValue="booking">
            {TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {t(`topics.${topic}`)}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <FormField id="message" label={t("message")} hint={t("messageHint")} error={fields.message ? t("field.message") : null}>
        {(c) => (
          <textarea
            {...c}
            required
            minLength={10}
            maxLength={2000}
            className="min-h-36 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        )}
      </FormField>
      <div aria-live="polite">{status && <Notice tone={status.tone}>{status.text}</Notice>}</div>
      <Button type="submit" disabled={loading}>
        {loading ? common("loading") : t("send")}
      </Button>
    </form>
  );
}
