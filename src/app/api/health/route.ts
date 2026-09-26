import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [salons, openSlots] = await Promise.all([
      prisma.salon.count(),
      prisma.slot.count({ where: { status: "OPEN", startsAt: { gte: new Date() } } }),
    ]);
    return NextResponse.json({
      ok: true,
      service: "gatvuller",
      salons,
      openSlots,
      ts: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "db" },
      { status: 500 }
    );
  }
}
