"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useErrorText } from "@/lib/i18n/use-error-text";

/**
 * A score has to be chosen on purpose: nothing is pre-selected. The form is only rendered for a booking that
 * the server says can be reviewed; the API checks it again.
 */
export function ReviewForm({ bookingId, verified = false, windowDays }: { bookingId: string; verified?: boolean; windowDays?: number }) {
  const t = useTranslations("ui.review");
  const common = useTranslations("ui.common");
  const errorText = useErrorText();
  const router = useRouter();
  const busy = useRef(false);
  const stars = useRef<Array<HTMLButtonElement | null>>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  function choose(n: number, focus = false) {
    setRating(n);
    setError(null);
    if (focus) stars.current[n - 1]?.focus();
  }

  function onKey(event: React.KeyboardEvent, n: number) {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      choose(Math.min(5, n + 1), true);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      choose(Math.max(1, n - 1), true);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    if (rating < 1) {
      setError(t("pick"));
      stars.current[0]?.focus();
      return;
    }
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, rating, comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errorText(data.error));
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError(errorText(null));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm font-medium text-emerald-800" role="status">
        {t("done")}
      </p>
    );
  }

  // Roving tabindex: one tab stop for the group, arrow keys move inside it.
  const tabStop = rating > 0 ? rating : 1;

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4" aria-busy={loading}>
      <fieldset>
        <legend className="text-sm font-semibold text-ink">{t("title")}</legend>
        <div className="mt-1 flex gap-0.5" role="radiogroup" aria-label={t("title")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              ref={(el) => {
                stars.current[n - 1] = el;
              }}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={t("stars", { n })}
              tabIndex={n === tabStop ? 0 : -1}
              onClick={() => choose(n)}
              onKeyDown={(event) => onKey(event, n)}
              className="flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Star aria-hidden="true" className={`h-7 w-7 ${n <= rating ? "fill-amber-400 text-amber-500" : "text-stone-400"}`} />
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`review-${bookingId}`} className="text-sm font-medium text-stone-700">
          {t("commentLabel")}
        </label>
        <textarea
          id={`review-${bookingId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={800}
          placeholder={t("placeholder")}
          aria-describedby={`review-hint-${bookingId}`}
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          rows={3}
        />
        <p id={`review-hint-${bookingId}`} className="mt-1 text-xs text-stone-500">
          {verified ? t("verifiedHint") : t("unverifiedHint")}
          {windowDays ? ` ${t("windowHint", { days: windowDays })}` : ""}
        </p>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" disabled={loading}>
        {loading ? common("loading") : t("submit")}
      </Button>
    </form>
  );
}
