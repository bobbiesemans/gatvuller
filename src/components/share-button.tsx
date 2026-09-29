"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check } from "lucide-react";

export function ShareButton({ title, url }: { title: string; url?: string }) {
  const [ok, setOk] = useState(false);
  async function share() {
    const href = url || (typeof window !== "undefined" ? window.location.href : "");
    try {
      if (navigator.share) {
        await navigator.share({ title, url: href, text: `${title} — last-minute afspraak op GatVuller` });
        return;
      }
      await navigator.clipboard.writeText(href);
      setOk(true);
      setTimeout(() => setOk(false), 2000);
    } catch {
      /* cancelled */
    }
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={share} className="gap-1.5">
      {ok ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {ok ? "Link gekopieerd" : "Deel"}
    </Button>
  );
}
