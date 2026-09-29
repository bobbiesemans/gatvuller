"use client";

import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";

/** Black on white with a full quiet zone: scans from a phone screen and prints cleanly. */
export function BookingQr({ value, size = 176 }: { value: string; size?: number }) {
  const t = useTranslations("ui.voucher");
  return (
    <div
      role="img"
      aria-label={t("qrLabel")}
      className="inline-flex shrink-0 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm print:shadow-none"
    >
      <QRCodeSVG value={value} size={size} level="M" marginSize={2} bgColor="#ffffff" fgColor="#000000" aria-hidden="true" />
    </div>
  );
}
