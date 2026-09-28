import { NextResponse } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { anonymizeAccount, exportAccount } from "@/lib/account";

/** Download of one's own data. */
export const GET = route(async () => {
  const user = await requireUser();
  await enforceRateLimit(`export:${user.id}`, 5, 60 * 60);
  return new NextResponse(JSON.stringify(await exportAccount(user.id), null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="gatvuller-gegevens.json"`,
      "Cache-Control": "no-store",
    },
  });
});

const patchSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(30).optional().nullable(),
  locale: z.enum(["nl", "fr", "en"]),
});

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, patchSchema);
  await prisma.user.update({ where: { id: user.id }, data: { name: body.name, phone: body.phone || null, locale: body.locale } });
  return NextResponse.json({ ok: true });
});

export const DELETE = route(async (req) => {
  const user = await requireUser();
  await parseBody(req, z.object({ confirm: z.literal("VERWIJDER") }));
  await anonymizeAccount(user.id);
  return NextResponse.json({ ok: true });
});
