import { prisma } from "./prisma";
import { isDemoMode } from "./config";
import { brusselsDateTime } from "./time";

/** Wall-clock hours (Brussels) demo offers are spread over. */
const DEMO_HOURS = [10, 11.5, 13, 14.5, 16, 17.5, 19];
const MIN_OPEN_PER_SALON = 2;

/**
 * Test mode only: keeps the showcase marketplace alive. Demo salons get fresh offers for today
 * and tomorrow based on the services they already listed, so the map is never empty.
 * Real salons are never touched. Idempotent: it only tops salons up to a minimum.
 */
export async function refreshDemoSlots(now: Date = new Date()) {
  if (!isDemoMode()) return { created: 0, skipped: "not_demo" as const };
  const horizon = new Date(now.getTime() + 60 * 60_000);
  const salons = await prisma.salon.findMany({
    where: { isDemo: true, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      slots: { orderBy: { createdAt: "desc" }, take: 12, select: { title: true, startsAt: true, endsAt: true, originalPrice: true, discountPrice: true, status: true } },
    },
  });
  let created = 0;
  for (const [index, salon] of salons.entries()) {
    const open = salon.slots.filter((s) => s.status === "OPEN" && s.startsAt > horizon).length;
    if (open >= MIN_OPEN_PER_SALON) continue;
    const templates = Array.from(new Map(salon.slots.map((s) => [s.title, s])).values());
    if (templates.length === 0) continue;
    let need = MIN_OPEN_PER_SALON - open;
    for (let day = 0; day <= 1 && need > 0; day++) {
      for (let k = 0; k < DEMO_HOURS.length && need > 0; k++) {
        const h = DEMO_HOURS[(index + k * 3 + day) % DEMO_HOURS.length];
        const startsAt = brusselsDateTime(day, Math.floor(h), (h % 1) * 60, now);
        if (startsAt <= horizon) continue;
        const t = templates[(k + day) % templates.length];
        const minutes = Math.max(15, Math.round((t.endsAt.getTime() - t.startsAt.getTime()) / 60_000));
        await prisma.slot.create({
          data: {
            salonId: salon.id,
            title: t.title,
            description: `Surprise slot bij ${salon.name} — last-minute met korting.`,
            startsAt,
            endsAt: new Date(startsAt.getTime() + minutes * 60_000),
            originalPrice: t.originalPrice,
            discountPrice: t.discountPrice,
            capacity: 1,
            spotsLeft: 1,
            status: "OPEN",
          },
        });
        created++;
        need--;
      }
    }
  }
  return { created };
}

let lastRun = 0;

/** Browsing trigger: at most every 10 minutes per server instance, never blocks the response. */
export async function maybeRefreshDemoSlots() {
  if (!isDemoMode() || Date.now() - lastRun < 10 * 60_000) return;
  lastRun = Date.now();
  await refreshDemoSlots().catch(() => undefined);
}
