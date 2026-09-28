import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn("h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-ink", className)}
      {...props}
    />
  );
}
