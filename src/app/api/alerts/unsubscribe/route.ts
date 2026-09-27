import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (token) {
    await prisma.slotAlert.updateMany({ where: { token }, data: { active: false } });
  }
  return NextResponse.redirect(`${appUrl()}/slots?alert=uit`);
}
