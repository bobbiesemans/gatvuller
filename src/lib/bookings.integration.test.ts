import { afterAll, describe, expect, it } from "vitest";
import { hash } from "bcryptjs";
import { prisma } from "./prisma";
import { ApiError } from "./errors";
import { startCheckout, markPaid } from "./bookings";
import { requireOwnedSalon } from "./ownership";

const enabled = Boolean(process.env.DATABASE_URL);
const stamp = Date.now();
const ids: string[] = [];
let salonId = "";
let slotId = "";

async function user(role: "SALON_OWNER" | "CUSTOMER" | "ADMIN", n: number) {
  const created = await prisma.user.create({
    data: {
      email: `mvp-${stamp}-${n}@example.com`,
      name: `Test ${n}`,
      passwordHash: await hash("test-password-8", 10),
      role,
    },
  });
  ids.push(created.id);
  return created;
}

describe.skipIf(!enabled)("reservation integrity", () => {
  afterAll(async () => {
    if (salonId) await prisma.salon.delete({ where: { id: salonId } }).catch(() => undefined);
    if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("lets only one of two simultaneous checkouts take the last spot", async () => {
    const owner = await user("SALON_OWNER", 1);
    const a = await user("CUSTOMER", 2);
    const b = await user("CUSTOMER", 3);
    const stranger = await user("CUSTOMER", 4);
    const salon = await prisma.salon.create({
      data: {
        ownerId: owner.id,
        name: `Testzaak ${stamp}`,
        slug: `testzaak-${stamp}`,
        city: "Antwerpen",
        category: "KAPPER",
        description: "Tijdelijke testzaak",
        address: "Teststraat 1",
        lat: 51.22,
        lng: 4.4,
      },
    });
    salonId = salon.id;
    const start = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const slot = await prisma.slot.create({
      data: {
        salonId: salon.id,
        title: "Testknip",
        startsAt: start,
        endsAt: new Date(start.getTime() + 45 * 60 * 1000),
        originalPrice: 4500,
        discountPrice: 2900,
        capacity: 1,
        spotsLeft: 1,
      },
    });
    slotId = slot.id;

    await expect(requireOwnedSalon(stranger, salon.id)).rejects.toBeInstanceOf(ApiError);

    const results = await Promise.allSettled([
      startCheckout({ slotId, customerName: "A", customerEmail: a.email, user: { id: a.id, locale: "nl" } }),
      startCheckout({ slotId, customerName: "B", customerEmail: b.email, user: { id: b.id, locale: "nl" } }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);

    const stored = await prisma.slot.findUnique({ where: { id: slotId } });
    expect(stored?.spotsLeft).toBeGreaterThanOrEqual(0);
    expect(stored?.spotsLeft).toBe(0);

    const paid = await prisma.booking.findFirst({ where: { slotId, status: "PAID" } });
    expect(paid?.stripePaymentId).toBe("demo");
    expect(paid?.amount).toBe(2900);
    expect(paid?.feeAmount).toBe(Math.round((2900 * paid!.feePercent) / 100));
    const again = await markPaid(paid!.id, "demo");
    expect(again.changed).toBe(false);

    await prisma.slot.update({ where: { id: slotId }, data: { status: "PAUSED", spotsLeft: 1, capacity: 2 } });
    await expect(
      startCheckout({ slotId, customerName: "A", customerEmail: a.email, user: { id: a.id, locale: "nl" } })
    ).rejects.toMatchObject({ code: "slot_unavailable" });
  });
});
