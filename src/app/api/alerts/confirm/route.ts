import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/config";
import { recordEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (token && /^[a-z0-9]{10,40}$/i.test(token)) {
    const res = await prisma.slotAlert.updateMany({ where: { token, confirmedAt: null }, data: { confirmedAt: new Date(), active: true } });
    if (res.count) await recordEvent("alert_confirmed");
  }
  return NextResponse.redirect(`${appUrl()}/slots?alert=aan`);
}
