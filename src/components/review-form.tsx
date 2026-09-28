"use client";

import { useErrorText } from "@/lib/i18n/use-error-text";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const errorText = useErrorText();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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

  if (done) return <p className="text-sm font-medium text-emerald-700">Bedankt, je review staat online.</p>;

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-800">Hoe was het?</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`h-9 w-9 rounded-lg text-sm font-bold ${n <= rating ? "bg-amber-400 text-white" : "bg-white text-slate-400 border border-slate-200"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={800}
        placeholder="Kort en eerlijk (optioneel)"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        rows={2}
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "Bezig…" : "Plaats review"}
      </Button>
    </form>
  );
}
