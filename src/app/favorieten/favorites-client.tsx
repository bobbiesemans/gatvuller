"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getFavorites } from "@/lib/favorites";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

export function FavoritesClient() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(getFavorites());
    sync();
    window.addEventListener("gv-favorites", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("gv-favorites", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (ids.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <Heart className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-4 text-lg font-semibold text-slate-800">Nog geen favorieten</p>
        <p className="mt-2 text-slate-500">Tik op het hartje op een Surprise card om hem hier te bewaren.</p>
        <Button asChild className="mt-6">
          <Link href="/slots">Ontdek slots op de kaart</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {ids.map((id) => (
        <li
          key={id}
          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Heart className="h-5 w-5 shrink-0 fill-rose-500 text-rose-500" />
            <span className="truncate text-sm font-medium text-slate-700">Slot {id.slice(-8).toUpperCase()}</span>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/slots/${id}`}>Open</Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}
