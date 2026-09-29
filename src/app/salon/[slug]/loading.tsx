import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";

export default async function Loading() {
  const t = await getTranslations("ui.common");
  return (
    <div className="mx-auto max-w-5xl px-4 py-8" role="status" aria-busy="true">
      <span className="sr-only">{t("loading")}</span>
      <div className="grid gap-8 md:grid-cols-5">
        <div className="space-y-4 md:col-span-3">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="space-y-4 md:col-span-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
