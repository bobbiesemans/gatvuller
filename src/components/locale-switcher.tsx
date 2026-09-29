"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_NAMES, locales, type Locale } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";

export function LocaleSwitcher({ current, label }: { current: Locale; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <select
      aria-label={label}
      value={current}
      disabled={pending}
      className="h-11 max-w-[7.5rem] rounded-lg border border-stone-300 bg-white px-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      onChange={(event) => {
        const next = event.target.value;
        start(async () => {
          await setLocale(next);
          router.refresh();
        });
      }}
    >
      {locales.map((locale) => (
        <option key={locale} value={locale} lang={locale}>
          {LOCALE_NAMES[locale]}
        </option>
      ))}
    </select>
  );
}
