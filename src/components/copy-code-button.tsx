"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function CopyCodeButton({ code }: { code: string }) {
  const t = useTranslations("ui.copyCode");
  const [ok, setOk] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className="gap-1.5"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        } catch {
          /* clipboard not available: the code is on screen anyway */
        }
      }}
    >
      {ok ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
      <span aria-live="polite">{ok ? t("copied") : t("copy")}</span>
    </Button>
  );
}
