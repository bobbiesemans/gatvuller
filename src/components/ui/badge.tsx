import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "success" | "warn" | "violet";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variant === "default" && "bg-slate-100 text-slate-700",
        variant === "success" && "bg-emerald-100 text-emerald-800",
        variant === "warn" && "bg-amber-100 text-amber-800",
        variant === "violet" && "bg-[#f8ebe5] text-[#8f3820]",
        className
      )}
      {...props}
    />
  );
}
