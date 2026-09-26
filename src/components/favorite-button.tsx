"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { getFavorites, toggleFavorite } from "@/lib/favorites";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  slotId,
  className,
}: {
  slotId: string;
  className?: string;
}) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => setOn(getFavorites().includes(slotId));
    sync();
    window.addEventListener("gv-favorites", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("gv-favorites", sync);
      window.removeEventListener("storage", sync);
    };
  }, [slotId]);

  return (
    <button
      type="button"
      aria-label={on ? "Verwijder favoriet" : "Bewaar favoriet"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(slotId);
        setOn(getFavorites().includes(slotId));
      }}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm border border-slate-200 hover:scale-105 transition",
        className
      )}
    >
      <Heart className={cn("h-4 w-4", on ? "fill-rose-500 text-rose-500" : "text-slate-500")} />
    </button>
  );
}
