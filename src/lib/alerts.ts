import type { Category } from "@prisma/client";
import { prisma } from "./prisma";
import { appUrl } from "./config";
import { localePath } from "@/i18n/config";
import { sendEmail } from "./email/send";
import { slotAlertEmail } from "./email/templates";

/** Tells people who asked for this city or category. Failures stay in the outbox and never block the post. */
export async function notifySlotAlerts(slotId: string) {
  const slot = await prisma.slot.findUnique({ where: { id: slotId }, include: { salon: true } });
  if (!slot || slot.status !== "OPEN") return;

  const alerts = await prisma.slotAlert.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ city: null }, { city: slot.salon.city }] },
        { OR: [{ category: null }, { category: slot.salon.category as Category }] },
      ],
    },
    take: 40,
  });

  for (const alert of alerts) {
    const locale = alert.locale || "nl";
    await sendEmail({
      to: alert.email,
      template: "slot_alert",
      ...slotAlertEmail(
        locale,
        {
          title: slot.title,
          salonName: slot.salon.name,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          originalPrice: slot.originalPrice,
          discountPrice: slot.discountPrice,
        },
        `${appUrl()}${localePath(locale, `/slots/${slot.id}`)}`,
        `${appUrl()}/api/alerts/unsubscribe?token=${alert.token}`
      ),
    });
    await prisma.slotAlert.update({ where: { id: alert.id }, data: { lastSentAt: new Date() } });
  }
}
