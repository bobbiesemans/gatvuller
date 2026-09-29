"use client";

import { Button } from "@/components/ui/button";

/** A two-step confirmation that stays on the page: clear on a phone, and usable with a keyboard. */
export function InlineConfirm({
  title,
  message,
  yes,
  no,
  busy,
  onYes,
  onNo,
  danger = true,
}: {
  title?: string;
  message: string;
  yes: string;
  no: string;
  busy: boolean;
  onYes: () => void;
  onNo: () => void;
  danger?: boolean;
}) {
  return (
    <div role="alertdialog" aria-label={title ?? message} className="w-full space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      {title && <p className="font-semibold">{title}</p>}
      <p>{message}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={danger ? "danger" : "default"} disabled={busy} onClick={onYes} className="min-h-11">
          {yes}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={onNo} className="min-h-11">
          {no}
        </Button>
      </div>
    </div>
  );
}
