import { cn } from "@/lib/utils";

export function Notice({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "warn" | "error";
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "info" && "border-stone-200 bg-white text-stone-700",
        tone === "warn" && "border-amber-200 bg-amber-50 text-amber-950",
        tone === "error" && "border-red-200 bg-red-50 text-red-800"
      )}
    >
      {children}
    </p>
  );
}
