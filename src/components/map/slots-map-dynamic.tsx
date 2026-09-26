"use client";

import dynamic from "next/dynamic";
import type { MapSlot } from "./slots-map";

export const SlotsMapDynamic = dynamic(
  () => import("./slots-map").then((m) => m.SlotsMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
        Kaart laden…
      </div>
    ),
  }
);

export type { MapSlot };
