"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getFavorites } from "@/lib/favorites";
import { Button } from "@/components/ui/button";
import { SlotCard } from "@/components/slot-card";
import { Heart } from "lucide-react";

type SlotRow = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  originalPrice: number;
  discountPrice: number;
  spotsLeft: number;
  status: string;
  salon: {
    name: string;
    city: string;
    category: string;
    ratingAvg: number;
    address: string;
    lat: number;
    lng: number;
  };
};

export function FavoritesClient() {
  const [ids, setIds] = useState<string[]>([]);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!ids.length) {
        setSlots([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/slots/batch?ids=${encodeURIComponent(ids.join(","))}`);
        const data = await res.json();
        if (!cancelled) setSlots(data.slots || []);
      } catch {
        if (!cancelled) setSlots([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  if (!loading && ids.length === 0) {
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

  if (loading) {
    return <p className="text-sm text-slate-500">Favorieten laden…</p>;
  }

  if (!slots.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Opgeslagen slots zijn niet meer beschikbaar (al geboekt of verlopen).
        <div className="mt-4">
          <Button asChild variant="secondary">
            <Link href="/slots">Nieuwe Surprise slots</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {slots.map((s) => (
        <div key={s.id} className="gv-card-hover rounded-2xl">
          <SlotCard
            id={s.id}
            title={s.title}
            startsAt={new Date(s.startsAt)}
            endsAt={new Date(s.endsAt)}
            originalPrice={s.originalPrice}
            discountPrice={s.discountPrice}
            spotsLeft={s.spotsLeft}
            salon={{ ...s.salon, rating: s.salon.ratingAvg }}
          />
        </div>
      ))}
    </div>
  );
}
