import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicSlotWhere } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

/** Public fields of bookable slots by id (favourites). Never raw salon rows. */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9]{10,40}$/i.test(s))
    .slice(0, 50);
  if (!ids.length) return NextResponse.json({ slots: [] });
  const slots = await prisma.slot.findMany({
    where: publicSlotWhere(new Date(), { id: { in: ids } }),
    select: {
      id: true, title: true, startsAt: true, endsAt: true, originalPrice: true, discountPrice: true, spotsLeft: true,
      salon: { select: { name: true, slug: true, city: true, category: true, ratingAvg: true, ratingCount: true, address: true, lat: true, lng: true, imageUrl: true, isDemo: true } },
    },
  });
  const byId = new Map(slots.map((s) => [s.id, { ...s, salon: { ...s.salon, rating: s.salon.ratingAvg } }]));
  return NextResponse.json({ slots: ids.map((id) => byId.get(id)).filter(Boolean) });
}
