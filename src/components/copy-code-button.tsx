"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

export function CopyCodeButton({ code }: { code: string }) {
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
          /* ignore */
        }
      }}
    >
      {ok ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {ok ? "Gekopieerd" : "Kopieer code"}
    </Button>
  );
}
