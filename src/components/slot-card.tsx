import Link from "next/link";
import { format } from "date-fns";
import { nlBE } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABELS, discountPercent, formatEuro } from "@/lib/utils";

type SlotCardProps = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  originalPrice: number;
  discountPrice: number;
  salon: {
    name: string;
    city: string;
    category: string;
    rating: number;
  };
};

export function SlotCard({ id, title, startsAt, endsAt, originalPrice, discountPrice, salon }: SlotCardProps) {
  const pct = discountPercent(originalPrice, discountPrice);
  return (
    <Link href={`/slots/${id}`} className="block group">
      <Card className="h-full overflow-hidden transition hover:border-violet-300 hover:shadow-md">
        <CardContent className="p-0">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-br from-violet-50 to-white p-4">
            <div>
              <Badge variant="violet">{CATEGORY_LABELS[salon.category] || salon.category}</Badge>
              <h3 className="mt-2 text-base font-bold text-slate-900 group-hover:text-violet-700">
                {title}
              </h3>
              <p className="text-sm text-slate-500">
                {salon.name} · {salon.city} · ★ {salon.rating.toFixed(1)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-violet-700">{formatEuro(discountPrice)}</p>
              <p className="text-xs text-slate-400 line-through">{formatEuro(originalPrice)}</p>
              <Badge variant="success" className="mt-1">
                -{pct}%
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-600">
            <span>
              {format(startsAt, "EEE d MMM · HH:mm", { locale: nlBE })}
              {" – "}
              {format(endsAt, "HH:mm", { locale: nlBE })}
            </span>
            <span className="font-semibold text-violet-600">Boek nu →</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
