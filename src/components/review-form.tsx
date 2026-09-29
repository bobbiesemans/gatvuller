"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useErrorText } from "@/lib/i18n/use-error-text";

/** A score has to be chosen on purpose: nothing is pre-selected. */
export function ReviewForm({ bookingId }: { bookingId: string }) {
  const t = useTranslations("ui.review");
  const errorText = useErrorText();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError(t("pick"));
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, rating, comment }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(errorText(data.error));
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) return <p className="text-sm font-medium text-emerald-800" role="status">{t("done")}</p>;

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
      <fieldset>
        <legend className="text-sm font-semibold text-ink">{t("title")}</legend>
        <div className="mt-2 flex gap-1" role="radiogroup" aria-label={t("title")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={t("stars", { n })}
              onClick={() => setRating(n)}
              className="rounded-lg p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Star aria-hidden="true" className={`h-7 w-7 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-stone-300"}`} />
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`review-${bookingId}`} className="sr-only">
          {t("commentLabel")}
        </label>
        <textarea
          id={`review-${bookingId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={800}
          placeholder={t("placeholder")}
          className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          rows={3}
        />
      </div>
      {error && (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? t("loading") : t("submit")}
      </Button>
    </form>
  );
}
