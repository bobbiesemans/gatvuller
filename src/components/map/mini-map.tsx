"use client";

import dynamic from "next/dynamic";

const Inner = dynamic(() => import("./mini-map-inner").then((m) => m.MiniMapInner), {
  ssr: false,
  loading: () => <div className="h-48 w-full animate-pulse rounded-2xl bg-slate-100" />,
});

export function MiniMap(props: {
  lat: number;
  lng: number;
  label?: string;
  className?: string;
}) {
  return <Inner {...props} />;
}
