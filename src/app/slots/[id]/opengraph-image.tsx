import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { OgCard, OG_SIZE } from "@/lib/og-card";
import { discountPercent, formatEuro } from "@/lib/money";
import { formatInZone } from "@/lib/time";
import { isDemoMode } from "@/lib/config";

export const alt = "Last-minute afspraak op GatVuller";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slot = await prisma.slot
    .findUnique({ where: { id }, select: { title: true, startsAt: true, originalPrice: true, discountPrice: true, salon: { select: { name: true, city: true, status: true, isDemo: true } } } })
    .catch(() => null);
  if (!slot || slot.salon.status !== "ACTIVE" || (slot.salon.isDemo && !isDemoMode())) {
    return new ImageResponse(<OgCard eyebrow="Last-minute" title="Vrije afspraken met korting" />, size);
  }
  return new ImageResponse(
    <OgCard
      eyebrow={`${slot.salon.name} · ${slot.salon.city}`}
      title={slot.title}
      subtitle={formatInZone(slot.startsAt, "nl")}
      price={formatEuro(slot.discountPrice)}
      was={formatEuro(slot.originalPrice)}
      badge={`−${discountPercent(slot.originalPrice, slot.discountPrice)}%`}
    />,
    size,
  );
}
