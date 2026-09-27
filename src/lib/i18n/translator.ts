import { createTranslator } from "next-intl";
import nl from "../../../messages/nl.json";
import fr from "../../../messages/fr.json";
import en from "../../../messages/en.json";
import { toLocale, type Locale } from "@/i18n/config";

const MESSAGES = { nl, fr, en } as const;

export type Translate = (key: string, values?: Record<string, string | number | Date>) => string;

export function messagesFor(locale: string) {
  return MESSAGES[toLocale(locale)];
}

/** Translator for code outside React (e-mails, calendar files, API responses). */
export function translator(locale: string, namespace?: string): Translate {
  const l: Locale = toLocale(locale);
  return createTranslator({ locale: l, messages: MESSAGES[l], namespace } as never) as unknown as Translate;
}
