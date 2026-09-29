"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("ui.system");
  useEffect(() => {
    console.error("[page]", error.digest || "error");
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center" role="alert">
      <h1 className="text-2xl text-ink">{t("errorTitle")}</h1>
      <p className="mt-2 text-sm text-stone-700">{t("errorBody")}</p>
      {error.digest && <p className="mt-2 text-xs text-stone-600">{t("errorRef", { ref: error.digest })}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={reset}>
          {t("retry")}
        </Button>
        <Button asChild variant="outline">
          <Link href="/">{t("home")}</Link>
        </Button>
      </div>
    </div>
  );
}
