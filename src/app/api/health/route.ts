import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: "gatvuller", ts: new Date().toISOString() });
  } catch (error) {
    log.error("health.db_failed", { error });
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
