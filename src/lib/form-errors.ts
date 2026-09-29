"use client";

import { useEffect, type RefObject } from "react";

/** API validation errors arrive as { error: "invalid_input", details: { field: [messages] } }. Returns the field names. */
export function invalidFields(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const details = (data as { details?: unknown }).details;
  if (!details || typeof details !== "object") return [];
  return Object.keys(details as Record<string, unknown>);
}

/**
 * Browser validation without the browser's own wording (which follows the browser language, not the site language):
 * forms use noValidate and read the same constraints here. Returns the names of the invalid controls.
 */
export function clientInvalid(form: HTMLFormElement): Record<string, true> {
  const out: Record<string, true> = {};
  for (const el of Array.from(form.elements)) {
    const control = el as HTMLInputElement;
    if (control.name && control.willValidate && !control.validity.valid) out[control.name] = true;
  }
  return out;
}

/** Moves focus to the first invalid control after a failed submit, so keyboard and screen-reader users land on the problem. */
export function useFocusFirstError(form: RefObject<HTMLFormElement | null>, trigger: unknown) {
  useEffect(() => {
    if (!trigger) return;
    const first = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    first?.focus();
  }, [form, trigger]);
}
