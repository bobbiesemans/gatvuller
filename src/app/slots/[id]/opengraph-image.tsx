import { ImageResponse } from "next/og";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { isDemoMode } from "@/lib/config";
import { discountPercent, formatEuro } from "@/lib/money";
import { formatInZone } from "@/lib/time";
import { toLocale } from "@/i18n/config";

export const alt = "GatVuller";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, locale] = await Promise.all([getTranslations("ui.offer"), getLocale()]);
  const lc = toLocale(locale);
  const found = await prisma.slot.findUnique({
    where: { id },
    select: {
      title: true,
      startsAt: true,
      originalPrice: true,
      discountPrice: true,
      salon: { select: { name: true, city: true, status: true, isDemo: true } },
    },
  });
  // Nothing about an offer that is not public leaks through the preview image.
  const slot = found && found.salon.status === "ACTIVE" && (!found.salon.isDemo || isDemoMode()) ? found : null;
  const title = slot?.title || "GatVuller";
  const sub = slot ? `${slot.salon.name} · ${slot.salon.city}` : t("ogTagline");
  const pct = slot ? discountPercent(slot.originalPrice, slot.discountPrice) : 0;
  const price = slot
    ? `${t("ogPrice", { price: formatEuro(slot.discountPrice, lc), original: formatEuro(slot.originalPrice, lc) })}${pct > 0 ? ` · −${pct}%` : ""}`
    : "";
  const when = slot ? formatInZone(slot.startsAt, lc, "dayTime") : "";
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background: "#faf7f2",
          color: "#1d1b18",
          padding: 72,
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 28, color: "#b4492b" }}>GatVuller</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 64, lineHeight: 1.05 }}>{title}</div>
          <div style={{ fontSize: 28, marginTop: 20 }}>{sub}</div>
          {slot && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 28, fontSize: 34, color: "#8f3820" }}>
              <div>{price}</div>
              <div style={{ marginTop: 8, fontSize: 28, color: "#57534e" }}>{when}</div>
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
