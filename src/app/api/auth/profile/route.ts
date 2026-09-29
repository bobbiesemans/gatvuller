import { NextResponse } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(30).optional().nullable(),
  locale: z.enum(["nl", "fr", "en"]),
  marketingOptIn: z.boolean(),
});

/** Profile and communication choices of the signed-in person. Identity always comes from the session. */
export const PATCH = route(async (req) => {
  const user = await requireUser();
  await enforceRateLimit(`profile:${user.id}`, 30, 60 * 60);
  const body = await parseBody(req, schema);
  await prisma.user.update({
    where: { id: user.id },
    data: { name: body.name, phone: body.phone || null, locale: body.locale, marketingOptIn: body.marketingOptIn },
  });
  return NextResponse.json({ ok: true });
});
