import { getTranslations } from "next-intl/server";
import { BadgeCheck, Star } from "lucide-react";
import { formatInZone } from "@/lib/time";

export type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  verifiedVisit: boolean;
  reply: string | null;
  customerName: string;
};

/** "Lotte Peeters" becomes "Lotte P.": reviews show a first name, never a full name. */
export function reviewerName(name: string, fallback: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export async function ReviewList({ reviews, locale }: { reviews: ReviewItem[]; locale: string }) {
  const t = await getTranslations("ui.offer");
  const r = await getTranslations("ui.review");
  return (
    <ul className="space-y-3">
      {reviews.map((review) => (
        <li key={review.id} className="rounded-2xl border border-stone-200 bg-white p-4 text-sm">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span role="img" aria-label={r("stars", { n: review.rating })} className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  aria-hidden="true"
                  className={`h-4 w-4 ${n <= review.rating ? "fill-amber-400 text-amber-400" : "text-stone-300"}`}
                />
              ))}
            </span>
            <span className="font-semibold text-ink">{reviewerName(review.customerName, t("reviewAnon"))}</span>
            <span className="text-stone-500">{formatInZone(review.createdAt, locale, "date")}</span>
            {review.verifiedVisit && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
                {t("verifiedVisit")}
              </span>
            )}
          </div>
          {review.comment && <p className="mt-2 whitespace-pre-line text-stone-700">{review.comment}</p>}
          {review.reply && (
            <div className="mt-3 border-l-2 border-brand-soft pl-3 text-stone-600">
              <p className="text-xs font-semibold text-stone-500">{t("salonReply")}</p>
              <p className="whitespace-pre-line">{review.reply}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
