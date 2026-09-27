import type { Prisma, Salon, Slot, User } from "@prisma/client";
import { prisma } from "./prisma";
import { ApiError } from "./errors";
import { randomCode } from "./codes";
import { isDemoMode, PAYMENT_HOLD_MINUTES, PLATFORM_FEE_PERCENT } from "./config";
import { platformFee } from "./utils";
import { getStripe, stripeConfigured, stripeLocale } from "./stripe";
import { appUrl } from "./config";
import { notifyBookingCancelled, notifyBookingPaid } from "./email/notify";
import type { CancelReason } from "./email/templates";

type Db = Prisma.TransactionClient;

const TAKEN = ["PAID", "NO_SHOW"] as const;

export async function recomputeSlot(db: Db | typeof prisma, slotId: string) {
  const slot = await db.slot.findUnique({ where: { id: slotId } });
  if (!slot || slot.status === "CANCELLED") return;
  const now = new Date();
  const taken = await db.booking.count({
    where: {
      slotId,
      OR: [{ status: { in: [...TAKEN] } }, { status: "PENDING", holdExpiresAt: { gt: now } }],
    },
  });
  const spotsLeft = Math.max(0, slot.capacity - taken);
  const ended = slot.endsAt <= now;
  const status =
    spotsLeft === 0 ? "BOOKED" : ended ? "EXPIRED" : slot.status === "PAUSED" ? "PAUSED" : "OPEN";
  await db.slot.update({ where: { id: slotId }, data: { spotsLeft, status } });
}

/** Releases abandoned checkouts. Safe to call often; the checkout transaction locks the slot itself. */
export async function expireStaleHolds() {
  const now = new Date();
  const stale = await prisma.booking.findMany({
    where: { status: "PENDING", holdExpiresAt: { lt: now } },
    select: { id: true, slotId: true },
  });
  if (!stale.length) return 0;
  await prisma.booking.updateMany({
    where: { id: { in: stale.map((s) => s.id) } },
    data: { status: "EXPIRED" },
  });
  for (const slotId of new Set(stale.map((s) => s.slotId))) {
    await recomputeSlot(prisma, slotId);
  }
  return stale.length;
}

async function freshCode(db: Db) {
  for (let i = 0; i < 6; i++) {
    const code = randomCode(8);
    const hit = await db.booking.findUnique({ where: { confirmationCode: code }, select: { id: true } });
    if (!hit) return code;
  }
  throw new ApiError(500, "server_error");
}

export type CheckoutInput = {
  slotId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  user: Pick<User, "id" | "locale">;
};

/**
 * Reserves one spot. With Stripe the spot stays held until checkout completes or expires.
 * Without Stripe (demo) the booking is paid immediately.
 */
export async function startCheckout(input: CheckoutInput) {
  await expireStaleHolds();
  const holdUntil = new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60 * 1000);

  const booking = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "Slot" WHERE id = ${input.slotId} FOR UPDATE`;
    const slot = await tx.slot.findUnique({ where: { id: input.slotId }, include: { salon: true } });
    if (!slot || slot.salon.status !== "ACTIVE") throw new ApiError(409, "slot_unavailable");
    if (slot.status !== "OPEN" || slot.startsAt <= new Date()) throw new ApiError(409, "slot_unavailable");

    await tx.booking.updateMany({
      where: { slotId: slot.id, status: "PENDING", holdExpiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });

    const mine = await tx.booking.findFirst({
      where: { slotId: slot.id, customerId: input.user.id, status: "PENDING", holdExpiresAt: { gt: new Date() } },
    });
    if (mine) return mine;

    const taken = await tx.booking.count({
      where: {
        slotId: slot.id,
        OR: [{ status: { in: [...TAKEN] } }, { status: "PENDING", holdExpiresAt: { gt: new Date() } }],
      },
    });
    if (taken >= slot.capacity) throw new ApiError(409, "slot_full");

    const created = await tx.booking.create({
      data: {
        slotId: slot.id,
        customerId: input.user.id,
        amount: slot.discountPrice,
        feeAmount: platformFee(slot.discountPrice),
        feePercent: PLATFORM_FEE_PERCENT,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone || null,
        locale: input.user.locale || "nl",
        confirmationCode: await freshCode(tx),
        status: "PENDING",
        holdExpiresAt: holdUntil,
      },
    });
    await recomputeSlot(tx, slot.id);
    return created;
  });

  if (!stripeConfigured()) {
    if (!isDemoMode()) {
      await releaseHold(booking.id);
      throw new ApiError(503, "payments_not_configured");
    }
    await markPaid(booking.id, "demo");
    return { demoPaid: true as const, bookingId: booking.id };
  }

  if (booking.stripeSessionId && booking.status === "PENDING") {
    const stripe = getStripe()!;
    const existing = await stripe.checkout.sessions.retrieve(booking.stripeSessionId).catch(() => null);
    if (existing?.url && existing.status === "open") {
      return { demoPaid: false as const, bookingId: booking.id, url: existing.url };
    }
  }

  const slot = await prisma.slot.findUnique({ where: { id: booking.slotId }, include: { salon: true } });
  if (!slot) throw new ApiError(409, "slot_unavailable");
  const stripe = getStripe()!;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: stripeLocale(input.user.locale),
      customer_email: input.customerEmail,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: slot.discountPrice,
            product_data: {
              name: `${slot.title} — ${slot.salon.name}`,
              description: `Last-minute bij ${slot.salon.name}, ${slot.salon.city}. Platformfee ${PLATFORM_FEE_PERCENT}%.`,
            },
          },
        },
      ],
      metadata: { bookingId: booking.id, slotId: slot.id },
      success_url: `${appUrl()}/boeking/succes?bookingId=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/boeking/annuleren?bookingId=${booking.id}`,
    });
    await prisma.booking.update({ where: { id: booking.id }, data: { stripeSessionId: session.id } });
    return { demoPaid: false as const, bookingId: booking.id, url: session.url };
  } catch (err) {
    await releaseHold(booking.id);
    console.error("[checkout]", err);
    throw new ApiError(502, "payment_unavailable");
  }
}

export async function markPaid(bookingId: string, paymentId: string) {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "Booking" WHERE id = ${bookingId} FOR UPDATE`;
    const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { slot: true } });
    if (!booking) throw new ApiError(404, "not_found");
    if (paymentId === "demo" && !isDemoMode()) throw new ApiError(403, "demo_disabled");
    if (booking.status === "PAID") return { booking, changed: false, overflow: false };
    if (booking.status === "CANCELLED" || booking.status === "REFUNDED") {
      return { booking, changed: false, overflow: true };
    }
    await tx.$executeRaw`SELECT id FROM "Slot" WHERE id = ${booking.slotId} FOR UPDATE`;
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "PAID", paidAt: new Date(), stripePaymentId: paymentId, holdExpiresAt: null },
    });
    const taken = await tx.booking.count({
      where: { slotId: booking.slotId, status: { in: [...TAKEN] } },
    });
    if (taken > booking.slot.capacity) {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED", cancelledAt: new Date(), cancelledBy: "SYSTEM" },
      });
      await recomputeSlot(tx, booking.slotId);
      return { booking, changed: false, overflow: true };
    }
    await recomputeSlot(tx, booking.slotId);
    return { booking, changed: true, overflow: false };
  });

  if (result.overflow && paymentId !== "demo") {
    const stripe = getStripe();
    if (stripe) await stripe.refunds.create({ payment_intent: paymentId }).catch((e) => console.error("[refund overflow]", e));
  }
  if (result.changed) await notifyBookingPaid(bookingId);
  return result;
}

export async function releaseHoldBySession(stripeSessionId: string) {
  const booking = await prisma.booking.findUnique({ where: { stripeSessionId } });
  if (booking) await releaseHold(booking.id);
}

async function releaseHold(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "PENDING") return;
  await prisma.booking.update({ where: { id: bookingId }, data: { status: "EXPIRED" } });
  await recomputeSlot(prisma, booking.slotId);
}

export async function cancelBooking(opts: {
  bookingId: string;
  actorId: string;
  actorRole: User["role"];
  reason: CancelReason;
}) {
  const loaded = await prisma.booking.findUnique({
    where: { id: opts.bookingId },
    include: { slot: { include: { salon: true } } },
  });
  if (!loaded) throw new ApiError(404, "not_found");
  const isCustomer = loaded.customerId === opts.actorId;
  const isSalon = loaded.slot.salon.ownerId === opts.actorId;
  const isAdmin = opts.actorRole === "ADMIN";
  if (!isCustomer && !isSalon && !isAdmin) throw new ApiError(403, "forbidden");
  if (loaded.status === "CANCELLED" || loaded.status === "REFUNDED" || loaded.status === "EXPIRED") {
    throw new ApiError(409, "already_cancelled");
  }

  if (loaded.status === "PENDING") {
    await releaseHold(loaded.id);
    return { refundAmount: 0 };
  }

  const hours = loaded.slot.salon.cancellationHours;
  const cutoff = loaded.slot.startsAt.getTime() - hours * 60 * 60 * 1000;
  if (isCustomer && !isAdmin && Date.now() > cutoff) throw new ApiError(409, "cancel_window_closed");

  let refundAmount = 0;
  let stripeRefundId: string | null = null;
  const paymentId = loaded.stripePaymentId;
  if (loaded.status === "PAID" && paymentId && paymentId !== "demo") {
    const stripe = getStripe();
    if (stripe) {
      const refund = await stripe.refunds.create({ payment_intent: paymentId });
      stripeRefundId = refund.id;
      refundAmount = refund.amount;
    }
  } else if (loaded.status === "PAID") {
    refundAmount = loaded.amount;
  }

  await prisma.booking.update({
    where: { id: loaded.id },
    data: {
      status: stripeRefundId ? "REFUNDED" : "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: opts.actorRole,
      refundAmount,
      stripeRefundId,
    },
  });
  await recomputeSlot(prisma, loaded.slotId);
  await notifyBookingCancelled(loaded.id, opts.reason, refundAmount);
  return { refundAmount };
}

export async function checkIn(code: string, actor: Pick<User, "id" | "role">) {
  const booking = await prisma.booking.findUnique({
    where: { confirmationCode: code },
    include: { slot: { include: { salon: true } } },
  });
  if (!booking) throw new ApiError(404, "not_found");
  const allowed = actor.role === "ADMIN" || booking.slot.salon.ownerId === actor.id;
  if (!allowed) throw new ApiError(403, "forbidden");
  if (booking.status !== "PAID") throw new ApiError(409, "not_paid");
  if (booking.checkedInAt) return booking;
  return prisma.booking.update({ where: { id: booking.id }, data: { checkedInAt: new Date() } });
}

export async function refreshSalonRating(salonId: string) {
  const agg = await prisma.review.aggregate({
    where: { salonId, hidden: false },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.salon.update({
    where: { id: salonId },
    data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count },
  });
}

export type SlotWithSalon = Slot & { salon: Salon };
