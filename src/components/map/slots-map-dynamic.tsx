"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { MapSlot } from "./slots-map";

function MapLoading() {
  const t = useTranslations("ui.map");
  return (
    <div role="status" className="flex h-full min-h-[320px] w-full items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 text-sm text-stone-600">
      {t("loading")}
    </div>
  );
}

export const SlotsMapDynamic = dynamic(() => import("./slots-map").then((m) => m.SlotsMap), {
  ssr: false,
  loading: () => <MapLoading />,
});

export type { MapSlot };
