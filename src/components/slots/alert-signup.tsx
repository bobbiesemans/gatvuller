"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useErrorText } from "@/lib/i18n/use-error-text";
import { cn } from "@/lib/utils";

/**
 * "Tell me when something is free" for a city, a category or one business.
 * Signed-in people are switched on at once; guests get a confirmation link first (double opt-in, server side).
 */
export function AlertSignup({
  body,
  city,
  category,
  salonId,
  signedInEmail,
  className,
}: {
  body: string;
  city?: string | null;
  category?: string | null;
  salonId?: string | null;
  /** Set for a signed-in customer: their own address is used and never asked again. */
  signedInEmail?: string | null;
  className?: string;
}) {
  const t = useTranslations("ui.alerts");
  const common = useTranslations("ui.common");
  const errorText = useErrorText();
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState("");
  const [confirmation, setConfirmation] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = (signedInEmail || email).trim();
    setState("busy");
    setError(null);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address, city: city || null, category: category || null, salonId: salonId || null }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; confirmationSent?: boolean };
      if (!res.ok) {
        setError(errorText(data.error));
        setState("idle");
        return;
      }
      setSentTo(address);
      setConfirmation(Boolean(data.confirmationSent));
      setState("done");
    } catch {
      setError(errorText("server_error"));
      setState("idle");
    }
  }

  return (
    <section aria-labelledby={`${id}-h`} className={cn("rounded-2xl border border-stone-200 bg-white p-5 text-left sm:p-6", className)}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Bell aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 id={`${id}-h`} className="text-lg text-ink">{t("heading")}</h2>
          <p className="mt-1 text-sm text-stone-600">{body}</p>
        </div>
      </div>
      {state !== "done" && (
        <form onSubmit={submit} className="mt-4 space-y-3" noValidate={false}>
          {signedInEmail ? (
            <p className="text-sm text-stone-700">{t("signedInLine", { email: signedInEmail })}</p>
          ) : (
            <div className="space-y-1">
              <Label htmlFor={`${id}-email`}>{t("email")}</Label>
              <Input
                id={`${id}-email`}
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                required
                maxLength={120}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          )}
          <Button type="submit" disabled={state === "busy"} className="w-full sm:w-auto">
            {state === "busy" ? common("loading") : t("submit")}
          </Button>
          <p className="text-xs text-stone-600">{t("fine")}</p>
        </form>
      )}
      <div role="status" aria-live="polite">
        {state === "done" && (
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {confirmation ? t("doneGuest", { email: sentTo }) : t("doneSignedIn")}
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </section>
  );
}
