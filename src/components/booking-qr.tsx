"use client";

import { QRCodeSVG } from "qrcode.react";

export function BookingQr({ value }: { value: string }) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <QRCodeSVG value={value} size={160} level="M" includeMargin={false} />
    </div>
  );
}
