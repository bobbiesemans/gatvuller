"use client";

import { useState } from "react";

export function FilterDrawer({
  label,
  active,
  children,
}: {
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(active);
  return (
    <div className="mt-6">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-2xl border border-[#e7dfd6] bg-white px-4 py-3 text-sm font-semibold text-ink md:hidden"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <span aria-hidden>{open ? "–" : "+"}</span>
      </button>
      <div className={open ? "mt-3 md:mt-0" : "hidden md:block"}>{children}</div>
    </div>
  );
}
