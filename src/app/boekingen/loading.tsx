import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";

export default async function Loading() {
  const t = await getTranslations("ui.common");
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10" role="status" aria-busy="true">
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="h-9 w-56" />
      <div className="flex gap-2">
        <Skeleton className="h-11 w-32" />
        <Skeleton className="h-11 w-32" />
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
