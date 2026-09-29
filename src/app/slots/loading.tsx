import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";

export default async function Loading() {
  const t = await getTranslations("ui.common");
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:py-8">
      <p role="status" className="sr-only">{t("loading")}</p>
      <Skeleton className="h-8 w-56 motion-reduce:animate-none" />
      <div className="flex gap-2">
        <Skeleton className="h-11 flex-1 motion-reduce:animate-none" />
        <Skeleton className="h-11 w-28 motion-reduce:animate-none" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-11 w-24 rounded-full motion-reduce:animate-none" />
        <Skeleton className="h-11 w-24 rounded-full motion-reduce:animate-none" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-2xl motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}
