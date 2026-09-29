"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { InlineConfirm } from "@/components/dashboard/inline-confirm";
import { useErrorText } from "@/lib/i18n/use-error-text";
import { eurosToCents } from "@/lib/money";
import { checkSlotValues } from "@/lib/slot-rules";

export type OfferSlot = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  capacity: number;
  spotsLeft: number;
  originalPrice: number;
  discountPrice: number;
  startsAt: string;
  endsAt: string;
  /** Can still be edited, paused or resumed (not ended, not withdrawn). */
  active: boolean;
  /** Can still be withdrawn (not started, not withdrawn). */
  withdrawable: boolean;
};

const euros = (cents: number) => String(cents / 100).replace(".", ",");

type Message = { tone: "info" | "error"; text: string };

export function SlotActions({ slot }: { slot: OfferSlot }) {
  const t = useTranslations("ui.dashboard");
  const errorText = useErrorText();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const taken = Math.max(0, slot.capacity - slot.spotsLeft);
  const locked = taken > 0;

  const [title, setTitle] = useState(slot.title);
  const [description, setDescription] = useState(slot.description ?? "");
  const [original, setOriginal] = useState(euros(slot.originalPrice));
  const [discount, setDiscount] = useState(euros(slot.discountPrice));
  const [capacity, setCapacity] = useState(String(slot.capacity));
  const [fieldError, setFieldError] = useState<{ field: string; text: string } | null>(null);

  async function send(kind: "pause" | "resume" | "withdraw") {
    setBusy(kind);
    setMessage(null);
    try {
      const res =
        kind === "withdraw"
          ? await fetch(`/api/slots?id=${encodeURIComponent(slot.id)}`, { method: "DELETE" })
          : await fetch("/api/slots", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: slot.id, action: kind }),
            });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: "error", text: errorText(data.error) });
        return;
      }
      setConfirming(false);
      if (kind === "withdraw") {
        const refunded = Number(data.refunded ?? 0);
        const failed = Number(data.failed ?? 0);
        const parts = [t("actions.withdrawDone"), t("actions.withdrawRefunds", { count: refunded })];
        if (failed > 0) parts.push(t("actions.withdrawFailed", { count: failed }));
        setMessage({ tone: failed > 0 ? "error" : "info", text: parts.join(" ") });
      } else {
        setMessage({ tone: "info", text: t(kind === "pause" ? "actions.pauseDone" : "actions.resumeDone") });
      }
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: errorText("generic") });
    } finally {
      setBusy(null);
    }
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setFieldError(null);
    const originalCents = eurosToCents(original);
    const discountCents = eurosToCents(discount);
    const capacityNumber = Number(capacity);
    if (!locked) {
      if (title.trim().length < 2) return setFieldError({ field: "title", text: errorText("invalid_input") });
      if (originalCents === null) return setFieldError({ field: "original", text: t("form.priceInvalid") });
      if (discountCents === null) return setFieldError({ field: "discount", text: t("form.priceInvalid") });
      const rule = checkSlotValues(
        { startsAt: new Date(slot.startsAt), endsAt: new Date(slot.endsAt), originalPrice: originalCents, discountPrice: discountCents, capacity: capacityNumber },
        new Date(),
        { timing: false }
      );
      if (rule) return setFieldError({ field: rule === "capacity_out_of_range" ? "capacity" : "discount", text: errorText(rule) });
    } else if (!Number.isInteger(capacityNumber) || capacityNumber < slot.capacity || capacityNumber > 10) {
      return setFieldError({ field: "capacity", text: errorText("capacity_out_of_range") });
    }
    setBusy("edit");
    try {
      const body: Record<string, unknown> = { id: slot.id, action: "edit", description: description.trim() || null };
      if (!locked) {
        body.title = title.trim();
        body.originalPrice = originalCents;
        body.discountPrice = discountCents;
      }
      if (capacityNumber !== slot.capacity) body.capacity = capacityNumber;
      const res = await fetch("/api/slots", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: "error", text: errorText(data.error) });
        return;
      }
      setEditing(false);
      setMessage({ tone: "info", text: t("edit.saved") });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: errorText("generic") });
    } finally {
      setBusy(null);
    }
  }

  const working = busy !== null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {slot.active && (
          <Button type="button" size="sm" variant="outline" className="min-h-11" aria-expanded={editing} disabled={working} onClick={() => setEditing((v) => !v)}>
            {editing ? t("edit.close") : t("edit.open")}
          </Button>
        )}
        {slot.active && (slot.status === "OPEN" || slot.status === "BOOKED") && (
          <Button type="button" size="sm" variant="outline" className="min-h-11" disabled={working} onClick={() => send("pause")}>
            {busy === "pause" ? "…" : t("actions.pause")}
          </Button>
        )}
        {slot.active && slot.status === "PAUSED" && (
          <Button type="button" size="sm" variant="outline" className="min-h-11" disabled={working} onClick={() => send("resume")}>
            {busy === "resume" ? "…" : t("actions.resume")}
          </Button>
        )}
        {slot.withdrawable && !confirming && (
          <Button type="button" size="sm" variant="ghost" className="min-h-11" disabled={working} onClick={() => setConfirming(true)}>
            {t("actions.withdraw")}
          </Button>
        )}
      </div>

      {confirming && (
        <InlineConfirm
          title={t("actions.withdrawTitle")}
          message={t("actions.withdrawBody")}
          yes={t("actions.withdrawYes")}
          no={t("actions.keep")}
          busy={busy === "withdraw"}
          onYes={() => send("withdraw")}
          onNo={() => setConfirming(false)}
        />
      )}

      {editing && (
        <form onSubmit={save} noValidate className="space-y-4 rounded-xl border border-stone-200 bg-paper p-4">
          <p className="font-semibold text-ink">{t("edit.title")}</p>
          {locked && <Notice tone="info">{t("edit.locked")}</Notice>}
          <Field id={`title-${slot.id}`} label={t("form.title")} error={fieldError?.field === "title" ? fieldError.text : null}>
            <Input id={`title-${slot.id}`} value={title} maxLength={80} disabled={locked} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id={`original-${slot.id}`} label={t("form.original")} error={fieldError?.field === "original" ? fieldError.text : null}>
              <Input id={`original-${slot.id}`} inputMode="decimal" value={original} disabled={locked} onChange={(e) => setOriginal(e.target.value)} />
            </Field>
            <Field id={`discount-${slot.id}`} label={t("form.discount")} error={fieldError?.field === "discount" ? fieldError.text : null}>
              <Input id={`discount-${slot.id}`} inputMode="decimal" value={discount} disabled={locked} onChange={(e) => setDiscount(e.target.value)} />
            </Field>
            <Field
              id={`capacity-${slot.id}`}
              label={t("form.capacity")}
              hint={locked ? t("edit.capacityLocked") : undefined}
              error={fieldError?.field === "capacity" ? fieldError.text : null}
            >
              <Input id={`capacity-${slot.id}`} type="number" inputMode="numeric" min={locked ? slot.capacity : 1} max={10} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </Field>
          </div>
          <Field id={`description-${slot.id}`} label={t("form.description")}>
            <textarea
              id={`description-${slot.id}`}
              value={description}
              maxLength={400}
              rows={2}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
          </Field>
          <Button type="submit" disabled={working} className="w-full sm:w-auto">
            {busy === "edit" ? t("edit.saving") : t("edit.save")}
          </Button>
        </form>
      )}

      <div aria-live="polite">{message && <Notice tone={message.tone}>{message.text}</Notice>}</div>
    </div>
  );
}
