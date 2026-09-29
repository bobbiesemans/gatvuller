import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";

export default async function Loading() {
  const t = await getTranslations("ui.common");
  return (
    <div className="mx-auto max-w-5xl px-4 py-10" role="status" aria-busy="true">
      <span className="sr-only">{t("loading")}</span>
      <div className="grid gap-6 md:grid-cols-5">
        <div className="space-y-4 md:col-span-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-96 w-full md:col-span-2" />
      </div>
    </div>
  );
}
