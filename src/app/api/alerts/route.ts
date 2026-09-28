import { NextResponse } from "next/server";
import { z } from "zod";
import type { Category } from "@prisma/client";
import { route, parseBody, clientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { cityByName, isCategory, categoryMeta } from "@/lib/catalog";
import { sendEmail } from "@/lib/email/send";
import { alertConfirmEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/config";

const schema = z.object({
  email: z.string().trim().email().max(120),
  city: z.string().trim().max(40).optional().nullable(),
  category: z.string().max(20).optional().nullable(),
  salonId: z.string().max(40).optional().nullable(),
});

/** Signed-in users are confirmed at once; guests confirm by e-mail first (double opt-in). */
export const POST = route(async (req) => {
  await enforceRateLimit(`alert:${clientIp(req)}`, 6, 60 * 60);
  const body = await parseBody(req, schema);
  const user = await getCurrentUser();
  const email = body.email.toLowerCase();
  const city = cityByName(body.city)?.name ?? null;
  const category = body.category && isCategory(body.category) ? (body.category as Category) : null;
  const salon = body.salonId ? await prisma.salon.findFirst({ where: { id: body.salonId, status: "ACTIVE" }, select: { id: true, name: true } }) : null;
  const trusted = Boolean(user && user.email.toLowerCase() === email);

  const existing = await prisma.slotAlert.findFirst({ where: { email, city, category, salonId: salon?.id ?? null } });
  const alert = existing
    ? await prisma.slotAlert.update({ where: { id: existing.id }, data: { active: true, userId: user?.id ?? existing.userId, ...(trusted && !existing.confirmedAt ? { confirmedAt: new Date() } : {}) } })
    : await prisma.slotAlert.create({
        data: { email, city, category, salonId: salon?.id ?? null, userId: user?.id, locale: user?.locale || "nl", confirmedAt: trusted ? new Date() : null },
      });

  if (!alert.confirmedAt) {
    const what = salon?.name ?? [category ? categoryMeta(category).slug : null, city].filter(Boolean).join(" in ") ?? "GatVuller";
    await sendEmail({
      to: email,
      template: "alert_confirm",
      ...alertConfirmEmail(alert.locale, what || "GatVuller", `${appUrl()}/api/alerts/confirm?token=${alert.token}`),
    });
  }
  // Same answer whether or not the address was known.
  return NextResponse.json({ ok: true, confirmationSent: !alert.confirmedAt });
});
