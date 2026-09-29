import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const alt = "GatVuller";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slot = await prisma.slot.findUnique({
    where: { id },
    select: { title: true, salon: { select: { name: true, city: true } } },
  });
  const title = slot?.title || "GatVuller";
  const sub = slot ? `${slot.salon.name} · ${slot.salon.city}` : "Last-minute";
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
        </div>
      </div>
    ),
    { ...size }
  );
}
