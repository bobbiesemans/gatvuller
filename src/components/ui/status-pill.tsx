import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-800",
  OPEN: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-900",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-stone-200 text-stone-700",
  REFUNDED: "bg-stone-200 text-stone-700",
  EXPIRED: "bg-stone-200 text-stone-700",
  NO_SHOW: "bg-red-100 text-red-800",
  SUSPENDED: "bg-red-100 text-red-800",
};

export function StatusPill({ status, label }: { status: string; label: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", TONE[status] || "bg-brand-soft text-[#8f3820]")}>
      {label}
    </span>
  );
}
