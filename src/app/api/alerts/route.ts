import { NextResponse } from "next/server";
import { z } from "zod";
import { Category } from "@prisma/client";
import { route, parseBody, clientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { isCategory } from "@/lib/catalog";

const schema = z.object({
  email: z.string().trim().email().max(120),
  city: z.string().trim().max(40).optional().nullable(),
  category: z.string().optional().nullable(),
});

export const POST = route(async (req) => {
  await enforceRateLimit(`alert:${clientIp(req)}`, 6, 60 * 60);
  const body = await parseBody(req, schema);
  const user = await getCurrentUser();
  const email = body.email.toLowerCase();
  const city = body.city || null;
  const category = body.category && isCategory(body.category) ? (body.category as Category) : null;

  const existing = await prisma.slotAlert.findFirst({ where: { email, city, category } });
  if (existing) {
    await prisma.slotAlert.update({
      where: { id: existing.id },
      data: { active: true, userId: user?.id ?? existing.userId },
    });
    return NextResponse.json({ ok: true });
  }
  await prisma.slotAlert.create({
    data: { email, city, category, userId: user?.id, locale: user?.locale || "nl" },
  });
  return NextResponse.json({ ok: true });
});
