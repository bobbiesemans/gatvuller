import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center", className)}>
      <p className="font-semibold text-ink">{title}</p>
      {body && <p className="mt-2 text-sm text-stone-600">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
