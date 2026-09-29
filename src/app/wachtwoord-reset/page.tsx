import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { ResetForm } from "./reset-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.auth");
  return {
    title: t("resetTitle"),
    description: t("resetMetaDesc"),
    alternates: { canonical: "/wachtwoord-reset" },
    // The link carries a secret in the query string: never index it and never send it on as a referrer.
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default function ResetPage() {
  return (
    <div className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:py-16">
      <Suspense fallback={<Skeleton className="h-64 w-full max-w-md" />}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
