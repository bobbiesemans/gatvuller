"use client";

import { QRCodeSVG } from "qrcode.react";

export function BookingQr({ value, size = 160 }: { value: string; size?: number }) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm shrink-0">
      <QRCodeSVG value={value} size={size} level="M" includeMargin={false} />
    </div>
  );
}
