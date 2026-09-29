"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";

export type FilterValues = {
  q: string;
  stad: string;
  categorie: string;
  wanneer: string;
  dagdeel: string;
  max: string;
  korting: string;
  sorteer: string;
};

type Option = { value: string; label: string };

/**
 * Search, quick day chips and the remaining filters. Everything lives in the URL and is applied on the server.
 * Below 1024px the extra filters sit in a panel behind a "Filters" button so the results stay on the first screen.
 */
export function SlotFilters({
  values,
  cities,
  categories,
}: {
  values: FilterValues;
  cities: Option[];
  categories: Option[];
}) {
  const t = useTranslations("ui.slots");
  const id = useId();
  const panelId = `${id}-panel`;
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  const activeCount = [values.stad, values.categorie, values.dagdeel, values.max, values.korting].filter(Boolean).length;
  const anyActive = activeCount > 0 || Boolean(values.q) || Boolean(values.wanneer);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (open) panelRef.current?.querySelector<HTMLElement>("select, input")?.focus();
  }, [open]);

  function chipHref(day: "vandaag" | "morgen") {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) if (value && key !== "wanneer") params.set(key, value);
    if (values.wanneer !== day) params.set("wanneer", day);
    const qs = params.toString();
    return qs ? `/slots?${qs}` : "/slots";
  }

  const chip = (day: "vandaag" | "morgen", label: string) => {
    const on = values.wanneer === day;
    return (
      <Link
        href={chipHref(day)}
        aria-current={on ? "true" : undefined}
        onClick={() => track("filter_used", day === "vandaag" ? "today" : "tomorrow")}
        className={cn(
          "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none",
          on ? "border-brand bg-brand text-white" : "border-stone-300 bg-white text-ink hover:bg-stone-50"
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <form
      action="/slots"
      method="get"
      role="search"
      aria-label={t("filters")}
      className="mt-4"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
      onSubmit={() => track("filter_used", "apply")}
    >
      {values.wanneer && <input type="hidden" name="wanneer" value={values.wanneer} />}
      {values.sorteer && <input type="hidden" name="sorteer" value={values.sorteer} />}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Label htmlFor={`${id}-q`} className="sr-only">{t("search")}</Label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
          <input
            id={`${id}-q`}
            name="q"
            type="search"
            maxLength={100}
            defaultValue={values.q}
            placeholder={t("search")}
            className="h-11 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3 text-sm text-ink placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </div>
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 text-sm font-semibold text-ink hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:hidden"
        >
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          {t("filters")}
          {activeCount > 0 && (
            <>
              <span aria-hidden="true" className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs text-white">{activeCount}</span>
              <span className="sr-only">{t("filtersActive", { count: activeCount })}</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {chip("vandaag", t("today"))}
        {chip("morgen", t("tomorrow"))}
        {anyActive && (
          <Link href="/slots" className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-stone-700 underline underline-offset-2 hover:text-ink">
            <X aria-hidden="true" className="h-4 w-4" />
            {t("clear")}
          </Link>
        )}
      </div>

      <div
        id={panelId}
        ref={panelRef}
        className={cn(
          "mt-3 grid-cols-2 gap-3 rounded-2xl border border-stone-200 bg-white p-4 lg:grid lg:grid-cols-5 lg:border-0 lg:bg-transparent lg:p-0",
          open ? "grid" : "hidden"
        )}
      >
        <div className="space-y-1">
          <Label htmlFor={`${id}-stad`}>{t("city")}</Label>
          <Select id={`${id}-stad`} name="stad" defaultValue={values.stad}>
            <option value="">{t("allCities")}</option>
            {cities.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-categorie`}>{t("category")}</Label>
          <Select id={`${id}-categorie`} name="categorie" defaultValue={values.categorie}>
            <option value="">{t("allCategories")}</option>
            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-dagdeel`}>{t("part")}</Label>
          <Select id={`${id}-dagdeel`} name="dagdeel" defaultValue={values.dagdeel}>
            <option value="">{t("allDay")}</option>
            <option value="ochtend">{t("morning")}</option>
            <option value="middag">{t("afternoon")}</option>
            <option value="avond">{t("evening")}</option>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-max`}>{t("maxPrice")}</Label>
          <Select id={`${id}-max`} name="max" defaultValue={values.max}>
            <option value="">{t("anyPrice")}</option>
            <option value="25">{t("until", { amount: 25 })}</option>
            <option value="40">{t("until", { amount: 40 })}</option>
            <option value="60">{t("until", { amount: 60 })}</option>
          </Select>
        </div>
        <div className="col-span-2 space-y-1 lg:col-span-1">
          <Label htmlFor={`${id}-korting`}>{t("minDiscount")}</Label>
          <Select id={`${id}-korting`} name="korting" defaultValue={values.korting}>
            <option value="">{t("anyDiscount")}</option>
            <option value="20">{t("atLeast", { percent: 20 })}</option>
            <option value="30">{t("atLeast", { percent: 30 })}</option>
            <option value="40">{t("atLeast", { percent: 40 })}</option>
          </Select>
        </div>
        <div className="col-span-2 flex flex-wrap items-center gap-3 lg:col-span-5">
          <Button type="submit">{t("apply")}</Button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              buttonRef.current?.focus();
            }}
            className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-stone-700 underline underline-offset-2 hover:text-ink lg:hidden"
          >
            {t("filtersClose")}
          </button>
        </div>
      </div>
    </form>
  );
}
