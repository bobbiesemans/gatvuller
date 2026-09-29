import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";

export default async function Loading() {
  const t = await getTranslations("ui.common");
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-12" role="status" aria-busy="true">
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="mx-auto h-6 w-24" />
      <Skeleton className="mx-auto h-10 w-3/4" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
