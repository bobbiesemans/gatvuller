"use client";

import { useTranslations } from "next-intl";

/** Turns an API error code into a sentence in the visitor's language; unknown codes get a generic line. */
export function useErrorText() {
  const t = useTranslations("ui.errors");
  return (code: unknown) => (typeof code === "string" && t.has(code) ? t(code) : t("generic"));
}
