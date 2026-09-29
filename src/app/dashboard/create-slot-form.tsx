"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { VisibilityNote } from "@/components/dashboard/visibility-note";
import { useErrorText } from "@/lib/i18n/use-error-text";
import { discountPercent, eurosToCents, formatEuro } from "@/lib/money";
import { checkSlotValues } from "@/lib/slot-rules";
import { brusselsDateTime, minutesBetween, nextQuarterHour, parseBrusselsLocal, toBrusselsLocalInput } from "@/lib/time";

export type SlotTemplate = {
  id: string;
  salonId: string;
  title: string;
  durationMin: number;
  originalPrice: number;
  discountPrice: number;
};

const DURATIONS = [30, 45, 60, 90];
const IN_HOURS = [1, 2, 3];
const TOMORROW_AT = [10, 17];

const chip =
  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";

type FieldName = "title" | "start" | "end" | "original" | "discount" | "capacity";

export function CreateSlotForm({
  salons,
  templates,
  feePercent,
  leadMinutes,
}: {
  salons: { id: string; name: string; status: string }[];
  templates: SlotTemplate[];
  feePercent: number;
  leadMinutes: number;
}) {
  const t = useTranslations("ui.dashboard");
  const locale = useLocale();
  const errorText = useErrorText();
  const router = useRouter();

  const [salonId, setSalonId] = useState(salons[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [original, setOriginal] = useState("");
  const [discount, setDiscount] = useState("");
  const [capacity, setCapacity] = useState("1");
  const [description, setDescription] = useState("");
  const [touched, setTouched] = useState<Set<FieldName>>(new Set());
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [published, setPublished] = useState<string | null>(null);

  // Times depend on "now", so they are filled in after mount: server and browser never disagree on them.
  useEffect(() => {
    const start = nextQuarterHour(new Date(), 120);
    setStartsAt(toBrusselsLocalInput(start));
    setEndsAt(toBrusselsLocalInput(new Date(start.getTime() + 45 * 60_000)));
  }, []);

  const salon = salons.find((s) => s.id === salonId);
  const mine = templates.filter((tpl) => tpl.salonId === salonId);
  const start = parseBrusselsLocal(startsAt);
  const end = parseBrusselsLocal(endsAt);
  const length = start && end ? minutesBetween(start, end) : 45;
  const originalCents = eurosToCents(original);
  const discountCents = eurosToCents(discount);
  const capacityNumber = Number(capacity);

  const errors = useMemo(() => {
    const out: Partial<Record<FieldName, string>> = {};
    if (title.trim().length < 2) out.title = "invalid_input";
    if (originalCents === null) out.original = "price";
    if (discountCents === null) out.discount = "price";
    if (!start) out.start = "invalid_time";
    if (!end) out.end = "invalid_time";
    if (start && end) {
      const rule = checkSlotValues({
        startsAt: start,
        endsAt: end,
        originalPrice: originalCents ?? 2000,
        discountPrice: discountCents ?? 1000,
        capacity: capacityNumber,
      });
      if (rule) {
        const field: FieldName =
          rule === "too_soon" || rule === "too_far_ahead"
            ? "start"
            : rule === "invalid_time" || rule === "duration_out_of_range"
              ? "end"
              : rule === "capacity_out_of_range"
                ? "capacity"
                : "discount";
        out[field] = out[field] ?? rule;
      }
    }
    return out;
  }, [title, originalCents, discountCents, start, end, capacityNumber]);

  const message = (field: FieldName) => {
    const code = errors[field];
    if (!code || !(attempted || touched.has(field))) return null;
    return code === "price" ? t("form.priceInvalid") : errorText(code);
  };
  const touch = (field: FieldName) => setTouched((prev) => new Set(prev).add(field));

  function setStart(next: Date) {
    setStartsAt(toBrusselsLocalInput(next));
    setEndsAt(toBrusselsLocalInput(new Date(next.getTime() + length * 60_000)));
  }
  function setLength(minutes: number) {
    if (!start) return;
    setEndsAt(toBrusselsLocalInput(new Date(start.getTime() + minutes * 60_000)));
  }
  function applyTemplate(tpl: SlotTemplate) {
    setTitle(tpl.title);
    setTemplateId(tpl.id);
    setOriginal(String(tpl.originalPrice / 100).replace(".", ","));
    setDiscount(String(tpl.discountPrice / 100).replace(".", ","));
    setLength(tpl.durationMin);
  }

  const percent = originalCents && discountCents ? discountPercent(originalCents, discountCents) : null;
  const net = discountCents ? discountCents - Math.round((discountCents * feePercent) / 100) : null;
  const blocked = salon && salon.status !== "ACTIVE";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAttempted(true);
    setServerError(null);
    setPublished(null);
    if (Object.keys(errors).length > 0 || !start || !end || originalCents === null || discountCents === null) return;
    setBusy(true);
    try {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId,
          templateId: templateId ?? undefined,
          title: title.trim(),
          description: description.trim() || undefined,
          startsAt,
          endsAt,
          originalPrice: originalCents,
          discountPrice: discountCents,
          capacity: capacityNumber,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(errorText(data.error));
        return;
      }
      setPublished(typeof data.visibility === "string" ? data.visibility : "visible");
      setTitle("");
      setTemplateId(null);
      setDescription("");
      setAttempted(false);
      setTouched(new Set());
      router.refresh();
    } catch {
      setServerError(errorText("generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <p className="text-sm text-stone-600">{t("form.intro")}</p>

      {salons.length > 1 ? (
        <Field id="salonId" label={t("form.salon")}>
          <Select id="salonId" value={salonId} onChange={(e) => { setSalonId(e.target.value); setTemplateId(null); }}>
            {salons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        salon && <p className="text-sm font-medium text-ink">{t("form.salon")}: {salon.name}</p>
      )}
      {blocked && <Notice tone="warn">{errorText("salon_not_active")}</Notice>}

      {mine.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-700">{t("form.templates")}</p>
          <div className="flex flex-wrap gap-2">
            {mine.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className={`${chip} ${templateId === tpl.id ? "border-brand bg-brand-soft text-brand" : "border-stone-300 bg-white text-ink hover:bg-stone-50"}`}
              >
                {tpl.title} · {formatEuro(tpl.discountPrice, locale)}
              </button>
            ))}
          </div>
        </div>
      )}

      <Field id="title" label={t("form.title")} error={message("title")}>
        <Input
          id="title"
          value={title}
          maxLength={80}
          autoComplete="off"
          placeholder={t("form.titlePh")}
          aria-invalid={message("title") ? true : undefined}
          aria-describedby={message("title") ? "title-error" : undefined}
          onChange={(e) => { setTitle(e.target.value); setTemplateId(null); }}
          onBlur={() => touch("title")}
        />
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-medium text-stone-700">{t("form.when")}</p>
        <div className="flex flex-wrap gap-2">
          {IN_HOURS.map((hours) => (
            <button key={hours} type="button" className={`${chip} border-stone-300 bg-white text-ink hover:bg-stone-50`} onClick={() => setStart(nextQuarterHour(new Date(), hours * 60))}>
              {t("form.presetIn", { hours })}
            </button>
          ))}
          {TOMORROW_AT.map((hour) => (
            <button key={hour} type="button" className={`${chip} border-stone-300 bg-white text-ink hover:bg-stone-50`} onClick={() => setStart(brusselsDateTime(1, hour))}>
              {t("form.presetTomorrow", { time: `${hour}:00` })}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="startsAt" label={t("form.start")} error={message("start")}>
          <Input
            id="startsAt"
            type="datetime-local"
            value={startsAt}
            aria-invalid={message("start") ? true : undefined}
            aria-describedby={message("start") ? "startsAt-error" : undefined}
            onChange={(e) => {
              const next = parseBrusselsLocal(e.target.value);
              if (next) setStart(next);
              else setStartsAt(e.target.value);
            }}
            onBlur={() => touch("start")}
          />
        </Field>
        <Field id="endsAt" label={t("form.end")} error={message("end")}>
          <Input
            id="endsAt"
            type="datetime-local"
            value={endsAt}
            aria-invalid={message("end") ? true : undefined}
            aria-describedby={message("end") ? "endsAt-error" : undefined}
            onChange={(e) => setEndsAt(e.target.value)}
            onBlur={() => touch("end")}
          />
        </Field>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-stone-700">{t("form.duration")}</p>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              aria-pressed={length === minutes}
              onClick={() => setLength(minutes)}
              className={`${chip} ${length === minutes ? "border-brand bg-brand-soft text-brand" : "border-stone-300 bg-white text-ink hover:bg-stone-50"}`}
            >
              {t("form.minutes", { count: minutes })}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="originalPrice" label={t("form.original")} error={message("original")}>
          <Input
            id="originalPrice"
            inputMode="decimal"
            autoComplete="off"
            value={original}
            aria-invalid={message("original") ? true : undefined}
            aria-describedby={message("original") ? "originalPrice-error" : undefined}
            onChange={(e) => setOriginal(e.target.value)}
            onBlur={() => touch("original")}
          />
        </Field>
        <Field id="discountPrice" label={t("form.discount")} error={message("discount")}>
          <Input
            id="discountPrice"
            inputMode="decimal"
            autoComplete="off"
            value={discount}
            aria-invalid={message("discount") ? true : undefined}
            aria-describedby={message("discount") ? "discountPrice-error" : undefined}
            onChange={(e) => setDiscount(e.target.value)}
            onBlur={() => touch("discount")}
          />
        </Field>
        <Field id="capacity" label={t("form.capacity")} error={message("capacity")}>
          <Input
            id="capacity"
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            value={capacity}
            aria-invalid={message("capacity") ? true : undefined}
            aria-describedby={message("capacity") ? "capacity-error" : undefined}
            onChange={(e) => setCapacity(e.target.value)}
            onBlur={() => touch("capacity")}
          />
        </Field>
      </div>

      <p aria-live="polite" className="min-h-6 text-sm text-stone-700">
        {percent !== null && originalCents && discountCents && net !== null && (
          <>
            <strong className="text-ink">{t("form.percent", { percent })}</strong>{" "}
            {t("form.summary", { price: formatEuro(discountCents, locale), original: formatEuro(originalCents, locale), fee: feePercent, net: formatEuro(net, locale) })}
          </>
        )}
      </p>

      <Field id="description" label={t("form.description")}>
        <textarea
          id="description"
          value={description}
          maxLength={400}
          rows={2}
          placeholder={t("form.descriptionPh")}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
      </Field>

      {attempted && Object.keys(errors).length > 0 && <Notice tone="error">{t("form.fixFields")}</Notice>}
      {serverError && <Notice tone="error">{serverError}</Notice>}
      {published && (
        <div role="status" className="space-y-2 rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm font-semibold text-ink">{t("form.published")}</p>
          <VisibilityNote state={published} leadMinutes={leadMinutes} />
        </div>
      )}

      <Button type="submit" disabled={busy || Boolean(blocked)} className="w-full sm:w-auto">
        {busy ? t("form.submitting") : t("form.submit")}
      </Button>
    </form>
  );
}
