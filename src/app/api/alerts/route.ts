import { NextResponse } from "next/server";
import { z } from "zod";
import type { Category } from "@prisma/client";
import { route, parseBody, clientIp, requireUser } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { cityByName, isCategory, categoryMeta } from "@/lib/catalog";
import { sendEmail } from "@/lib/email/send";
import { alertConfirmEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/config";
import { sha256 } from "@/lib/codes";
import { getLocale } from "next-intl/server";

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
  const locale = await getLocale();
  const email = body.email.toLowerCase();
  const city = cityByName(body.city)?.name ?? null;
  const category = body.category && isCategory(body.category) ? (body.category as Category) : null;
  const salon = body.salonId ? await prisma.salon.findFirst({ where: { id: body.salonId, status: "ACTIVE" }, select: { id: true, name: true } }) : null;
  const trusted = Boolean(user && user.email.toLowerCase() === email);

  if (!trusted) await enforceRateLimit(`alert-mail:${sha256(email).slice(0, 20)}`, 3, 24 * 60 * 60);
  const existing = await prisma.slotAlert.findFirst({ where: { email, city, category, salonId: salon?.id ?? null } });
  const alert = existing
    ? await prisma.slotAlert.update({
        where: { id: existing.id },
        data: trusted
          ? { active: true, userId: user!.id, confirmedAt: existing.confirmedAt ?? new Date() }
          : existing.active && existing.confirmedAt
            ? {}
            : // Someone asking again for this address: it only starts after that address confirms.
              { active: false, confirmedAt: null },
      })
    : await prisma.slotAlert.create({
        data: {
          email,
          city,
          category,
          salonId: salon?.id ?? null,
          userId: trusted ? user!.id : null,
          locale: user?.locale || locale,
          active: trusted,
          confirmedAt: trusted ? new Date() : null,
        },
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

export const DELETE = route(async (req) => {
  const user = await requireUser();
  const salonId = new URL(req.url).searchParams.get("salonId");
  if (!salonId) throw new ApiError(400, "invalid_input");
  await prisma.slotAlert.updateMany({ where: { userId: user.id, salonId }, data: { active: false } });
  return NextResponse.json({ ok: true });
});
