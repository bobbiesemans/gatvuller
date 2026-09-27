import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Resolve Surprise slots by id list (for favorieten). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
  if (!ids.length) return NextResponse.json({ slots: [] });

  const slots = await prisma.slot.findMany({
    where: { id: { in: ids } },
    include: { salon: true },
  });
  // Keep client order
  const byId = new Map(slots.map((s) => [s.id, s]));
  return NextResponse.json({
    slots: ids.map((id) => byId.get(id)).filter(Boolean),
  });
}
