"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("ui.dashboard.error");
  const common = useTranslations("ui.common");
  useEffect(() => {
    console.error("[dashboard]", error.digest || "error");
  }, [error]);
  return (
    <div role="alert" className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl text-ink">{t("title")}</h1>
      <p className="mt-2 text-sm text-stone-600">{t("body")}</p>
      <Button type="button" className="mt-6" onClick={reset}>
        {common("retry")}
      </Button>
    </div>
  );
}
