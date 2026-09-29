"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function CopyCodeButton({ code }: { code: string }) {
  const t = useTranslations("ui.copyCode");
  const [state, setState] = useState<"idle" | "ok" | "failed">("idle");
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="gap-1.5"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setState("ok");
          } catch {
            setState("failed");
          }
          window.setTimeout(() => setState("idle"), 2500);
        }}
      >
        {state === "ok" ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
        {state === "ok" ? t("copied") : t("copy")}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "ok" ? t("copied") : state === "failed" ? t("failed") : ""}
      </span>
      {state === "failed" && <span className="ml-2 text-xs">{t("failed")}</span>}
    </>
  );
}
