import { formatEuro } from "@/lib/utils";

export function PriceTag({ price, original }: { price: number; original?: number }) {
  return (
    <p className="flex items-baseline gap-2">
      <span className="text-2xl font-extrabold text-ink">{formatEuro(price)}</span>
      {original != null && original > price && (
        <span className="text-sm text-stone-400 line-through">{formatEuro(original)}</span>
      )}
    </p>
  );
}
