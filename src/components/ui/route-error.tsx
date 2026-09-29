"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** Error boundary body for the booking screens: says what happened and what is safe. */
export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("ui.offer");
  useEffect(() => {
    console.error("[page]", error.digest || "error");
  }, [error]);
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center" role="alert">
      <h1 className="text-2xl text-ink">{t("loadErrorTitle")}</h1>
      <p className="mt-2 text-sm text-stone-600">{t("loadErrorBody")}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={reset}>
          {t("loadErrorRetry")}
        </Button>
        <Button asChild variant="outline">
          <Link href="/slots">{t("loadErrorBrowse")}</Link>
        </Button>
      </div>
    </div>
  );
}
