import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE } from "@/lib/og-card";

export const alt = "GatVuller — last-minute afspraken met korting";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgCard eyebrow="Vrije momenten bij zaken in de buurt" title="Een goed moment komt soms onverwacht." subtitle="Kapper, beauty, nagels en massage: vandaag nog, tot −50%." />,
    size,
  );
}
