import { hash } from "bcryptjs";
import type { Role, SalonStatus, SlotStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const stamp = Date.now().toString(36);
let counter = 0;

/** Creates rows for integration tests and removes them again in foreign-key order. */
export class Fixtures {
  private userIds: string[] = [];
  private salonIds: string[] = [];

  async user(role: Role = "CUSTOMER", overrides: { locale?: string; name?: string } = {}) {
    const n = ++counter;
    const user = await prisma.user.create({
      data: {
        email: `it-${stamp}-${n}@example.com`,
        name: overrides.name ?? `Test ${role.toLowerCase()} ${n}`,
        passwordHash: await hash("integration-test-pw", 4),
        role,
        locale: overrides.locale ?? "nl",
        termsAcceptedAt: new Date(),
      },
    });
    this.userIds.push(user.id);
    return user;
  }

  async salon(
    ownerId: string,
    opts: {
      status?: SalonStatus;
      isDemo?: boolean;
      stripeAccountId?: string | null;
      chargesEnabled?: boolean;
      cancellationHours?: number;
      city?: string;
    } = {}
  ) {
    const n = ++counter;
    const salon = await prisma.salon.create({
      data: {
        ownerId,
        name: `Testzaak ${n}`,
        slug: `testzaak-${stamp}-${n}`,
        city: opts.city ?? "Antwerpen",
        category: "KAPPER",
        description: "Tijdelijke testzaak voor integratietests",
        address: "Teststraat 1, 2000 Antwerpen",
        lat: 51.22,
        lng: 4.4,
        status: opts.status ?? "ACTIVE",
        isDemo: opts.isDemo ?? false,
        stripeAccountId: opts.stripeAccountId ?? null,
        stripeChargesEnabled: opts.chargesEnabled ?? Boolean(opts.stripeAccountId),
        cancellationHours: opts.cancellationHours ?? 2,
      },
    });
    this.salonIds.push(salon.id);
    return salon;
  }

  async slot(
    salonId: string,
    opts: { startsInMin?: number; durationMin?: number; capacity?: number; original?: number; discount?: number; status?: SlotStatus } = {}
  ) {
    const start = new Date(Date.now() + (opts.startsInMin ?? 180) * 60_000);
    const capacity = opts.capacity ?? 1;
    return prisma.slot.create({
      data: {
        salonId,
        title: "Testknip",
        startsAt: start,
        endsAt: new Date(start.getTime() + (opts.durationMin ?? 45) * 60_000),
        originalPrice: opts.original ?? 4500,
        discountPrice: opts.discount ?? 2900,
        capacity,
        spotsLeft: capacity,
        status: opts.status ?? "OPEN",
      },
    });
  }

  async cleanup() {
    if (this.salonIds.length) {
      await prisma.review.deleteMany({ where: { salonId: { in: this.salonIds } } });
      await prisma.report.deleteMany({ where: { salonId: { in: this.salonIds } } });
      await prisma.booking.deleteMany({ where: { slot: { salonId: { in: this.salonIds } } } });
      await prisma.slot.deleteMany({ where: { salonId: { in: this.salonIds } } });
      await prisma.salon.deleteMany({ where: { id: { in: this.salonIds } } });
    }
    if (this.userIds.length) {
      await prisma.booking.deleteMany({ where: { customerId: { in: this.userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: this.userIds } } });
    }
    this.userIds = [];
    this.salonIds = [];
  }
}

/** Polls until `check` is truthy, so tests can wait for a webhook to land. */
export async function waitFor<T>(check: () => Promise<T | false | null | undefined>, timeoutMs = 8000, label = "condition"): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
