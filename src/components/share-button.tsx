"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function ShareButton({ title, url }: { title: string; url?: string }) {
  const t = useTranslations("ui.share");
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function share() {
    const href = url || window.location.href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url: href, text: t("text", { title }) });
        return;
      }
      await navigator.clipboard.writeText(href);
      setState("copied");
    } catch (error) {
      // Closing the share sheet is not an error.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 3000);
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={share} className="gap-1.5">
        {state === "copied" ? <Check aria-hidden="true" className="h-4 w-4" /> : <Share2 aria-hidden="true" className="h-4 w-4" />}
        {state === "copied" ? t("copied") : t("label")}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied" ? t("copied") : state === "failed" ? t("failed") : ""}
      </span>
      {state === "failed" && <span className="text-xs text-red-700">{t("failed")}</span>}
    </>
  );
}
