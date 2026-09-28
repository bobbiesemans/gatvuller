import type { Booking, BookingStatus, Prisma, RefundStatus, Role } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "./prisma";
import { ApiError } from "./errors";
import { randomCode } from "./codes";
import {
  isDemoMode,
  LATE_PAYMENT_GRACE_MINUTES,
  MAX_OPEN_HOLDS,
  NO_SHOW_GRACE_MINUTES,
  PAYMENT_HOLD_MINUTES,
  PLATFORM_FEE_PERCENT,
  REVIEW_WINDOW_DAYS,
} from "./config";
import { checkSlotValues } from "./slot-rules";
import { platformFee } from "./money";
import { bookingLeadCutoff, isSalonBookable, paymentModeFor } from "./marketplace";
import { audit } from "./audit";
import { recordEvent } from "./analytics";
import { log } from "./log";
import * as payments from "./payments";
import { notifyBookingCancelled, notifyBookingPaid, type CancelReason } from "./email/notify";

type Tx = Prisma.TransactionClient;
type Db = Tx | typeof prisma;

/** Row locks can queue behind each other when many people book the same slot. */
const TX = { maxWait: 10_000, timeout: 20_000 } as const;

export type Actor = { id: string; role: Role };

/** Statuses that occupy a spot. A PENDING booking occupies one only while its hold runs. */
export const TAKEN_STATUSES: BookingStatus[] = ["PAID", "NO_SHOW"];

function takenWhere(slotId: string, now: Date, excludeId?: string): Prisma.BookingWhereInput {
  return {
    slotId,
    ...(excludeId ? { id: { not: excludeId } } : {}),
    OR: [{ status: { in: TAKEN_STATUSES } }, { status: "PENDING", holdExpiresAt: { gt: now } }],
  };
}

/**
 * Lock order is always slot, then booking. Every path that changes how many spots are taken
 * holds the slot row lock, so two checkouts for the last spot are serialised by Postgres.
 */
async function lockSlot(tx: Tx, slotId: string) {
  await tx.$queryRaw`SELECT id FROM "Slot" WHERE id = ${slotId} FOR UPDATE`;
}

async function lockBooking(tx: Tx, bookingId: string) {
  await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${bookingId} FOR UPDATE`;
}

/** Recomputes the cached `spotsLeft` and status from the bookings. Call inside the slot lock. */
export async function recomputeSlot(db: Db, slotId: string, now = new Date()) {
  const slot = await db.slot.findUnique({ where: { id: slotId }, select: { status: true, capacity: true, endsAt: true } });
  if (!slot || slot.status === "CANCELLED") return;
  const taken = await db.booking.count({ where: takenWhere(slotId, now) });
  const spotsLeft = Math.max(0, slot.capacity - taken);
  const status =
    slot.endsAt <= now ? "EXPIRED" : slot.status === "PAUSED" ? "PAUSED" : spotsLeft === 0 ? "BOOKED" : "OPEN";
  await db.slot.update({ where: { id: slotId }, data: { spotsLeft, status } });
}

/** Releases abandoned checkouts. Safe to call often and from several places at once. */
export async function expireStaleHolds(now = new Date()) {
  const stale = await prisma.booking.findMany({
    where: { status: "PENDING", holdExpiresAt: { lte: now } },
    select: { slotId: true },
    distinct: ["slotId"],
    take: 100,
  });
  let released = 0;
  for (const { slotId } of stale) {
    released += await prisma.$transaction(async (tx) => {
      await lockSlot(tx, slotId);
      const res = await tx.booking.updateMany({
        where: { slotId, status: "PENDING", holdExpiresAt: { lte: now } },
        data: { status: "EXPIRED", cancelReason: "hold_expired" },
      });
      await recomputeSlot(tx, slotId, now);
      return res.count;
    }, TX);
  }
  return released;
}

/** Marks offers whose time has passed. */
export async function expireEndedSlots(now = new Date()) {
  const res = await prisma.slot.updateMany({
    where: { status: { in: ["OPEN", "BOOKED", "PAUSED"] }, endsAt: { lte: now } },
    data: { status: "EXPIRED" },
  });
  return res.count;
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
  customer: { id: string; locale: string };
  contact: { name: string; email: string; phone?: string | null };
};

export type CheckoutResult =
  | { kind: "redirect"; bookingId: string; url: string }
  | { kind: "confirmed"; bookingId: string };

/**
 * Reserves one spot and hands the customer to Stripe Checkout. The amount and the commission come
 * from the slot in the database, never from the request. In test mode without Stripe the payment
 * is simulated and the booking says so.
 */
export async function startCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { booking, slot } = await reserveSpot(input, new Date());

    if (booking.paymentMode === "DEMO") {
      await markPaid(booking.id, { kind: "demo" });
      return { kind: "confirmed", bookingId: booking.id };
    }

    if (booking.stripeSessionId) {
      const session = await payments.retrieveCheckoutSession(booking.stripeSessionId);
      if (session?.status === "open" && session.url) return { kind: "redirect", bookingId: booking.id, url: session.url };
      if (session?.status === "complete") {
        await confirmCheckoutSession(session);
        return { kind: "confirmed", bookingId: booking.id };
      }
      // The session closed while the hold still ran: start over with a fresh hold.
      await releaseHold(booking.id, "session_closed");
      continue;
    }

    try {
      const session = await payments.createCheckoutSession({ booking, slot, salon: slot.salon });
      if (!session.url) throw new Error("Checkout session without url");
      await prisma.booking.update({ where: { id: booking.id }, data: { stripeSessionId: session.id } });
      return { kind: "redirect", bookingId: booking.id, url: session.url };
    } catch (error) {
      log.error("checkout.session_failed", { bookingId: booking.id, error });
      await releaseHold(booking.id, "checkout_failed");
      throw new ApiError(502, "payment_unavailable");
    }
  }
  throw new ApiError(409, "slot_unavailable");
}

async function reserveSpot(input: CheckoutInput, now: Date) {
  return prisma.$transaction(async (tx) => {
    await lockSlot(tx, input.slotId);
    // Abandoned holds go first: a slot that only looked full because of them is bookable again.
    const released = await tx.booking.updateMany({
      where: { slotId: input.slotId, status: "PENDING", holdExpiresAt: { lte: now } },
      data: { status: "EXPIRED", cancelReason: "hold_expired" },
    });
    if (released.count > 0) await recomputeSlot(tx, input.slotId, now);
    const slot = await tx.slot.findUnique({ where: { id: input.slotId }, include: { salon: true } });
    if (!slot) throw new ApiError(404, "not_found");
    if (!isSalonBookable(slot.salon)) throw new ApiError(409, "slot_unavailable");
    if (slot.salon.ownerId === input.customer.id) throw new ApiError(409, "own_salon");
    if (slot.startsAt < bookingLeadCutoff(now)) throw new ApiError(409, "slot_unavailable");
    // BOOKED can still hide the customer's own hold; the capacity count below decides.
    if (slot.status !== "OPEN" && slot.status !== "BOOKED") throw new ApiError(409, "slot_unavailable");

    const mine = await tx.booking.findFirst({
      where: { slotId: slot.id, customerId: input.customer.id, status: "PENDING", holdExpiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
    });
    if (mine) {
      const sessionPending = mine.paymentMode !== "DEMO" && !mine.stripeSessionId;
      if (!sessionPending) return { booking: mine, slot };
      // A second click while the first request is still opening Checkout.
      if (now.getTime() - mine.createdAt.getTime() < 90_000) throw new ApiError(409, "checkout_in_progress");
      await tx.booking.update({ where: { id: mine.id }, data: { status: "EXPIRED", cancelReason: "checkout_failed" } });
    }

    const otherHolds = await tx.booking.count({
      where: { customerId: input.customer.id, status: "PENDING", holdExpiresAt: { gt: now }, slotId: { not: slot.id } },
    });
    if (otherHolds >= MAX_OPEN_HOLDS) throw new ApiError(409, "too_many_holds");

    const taken = await tx.booking.count({ where: takenWhere(slot.id, now) });
    if (taken >= slot.capacity) throw new ApiError(409, "slot_full");

    const mode = paymentModeFor(slot.salon);
    const booking = await tx.booking.create({
      data: {
        slotId: slot.id,
        customerId: input.customer.id,
        amount: slot.discountPrice,
        feeAmount: platformFee(slot.discountPrice),
        feePercent: PLATFORM_FEE_PERCENT,
        customerName: input.contact.name,
        customerEmail: input.contact.email.toLowerCase(),
        customerPhone: input.contact.phone || null,
        locale: input.customer.locale || "nl",
        cancellationHours: slot.salon.cancellationHours,
        confirmationCode: await freshCode(tx),
        paymentMode: mode,
        stripeDestination: mode === "DEMO" ? null : slot.salon.stripeAccountId,
        status: "PENDING",
        holdExpiresAt: new Date(now.getTime() + PAYMENT_HOLD_MINUTES * 60_000),
      },
    });
    await recomputeSlot(tx, slot.id, now);
    return { booking, slot };
  }, TX);
}

export type PaymentProof =
  | { kind: "demo" }
  | { kind: "stripe"; paymentIntentId: string; sessionId: string; livemode: boolean };

export type PaidOutcome = "paid" | "already_paid" | "already_handled" | "duplicate_payment" | "unavailable";

/**
 * Marks a booking paid after Stripe confirmed it (webhook or a server-side session lookup), or
 * after a simulated payment in test mode. Idempotent: a retried event changes nothing. A payment
 * that arrives when the spot is gone, or a second payment for the same booking, is refunded.
 */
export async function markPaid(bookingId: string, proof: PaymentProof): Promise<PaidOutcome> {
  const head = await prisma.booking.findUnique({ where: { id: bookingId }, select: { slotId: true } });
  if (!head) throw new ApiError(404, "not_found");
  const paymentId = proof.kind === "stripe" ? proof.paymentIntentId : "demo";
  const now = new Date();

  const outcome = await prisma.$transaction(async (tx): Promise<PaidOutcome> => {
    await lockSlot(tx, head.slotId);
    await lockBooking(tx, bookingId);
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { slot: true } });

    if (proof.kind === "demo" && (booking.paymentMode !== "DEMO" || !isDemoMode())) {
      throw new ApiError(403, "demo_disabled");
    }
    if (proof.kind === "stripe" && booking.paymentMode === "DEMO") throw new ApiError(409, "payment_mode_mismatch");

    if (booking.status === "PAID" || booking.status === "NO_SHOW") {
      return proof.kind === "stripe" && booking.stripePaymentId && booking.stripePaymentId !== paymentId
        ? "duplicate_payment"
        : "already_paid";
    }
    if (booking.status === "REFUNDED") return "already_handled";
    if (booking.status === "CANCELLED") {
      // Cancelled while the payment was still open; the money has to go back (again, if a refund failed).
      if (proof.kind === "demo") return "already_handled";
      return booking.stripePaymentId === paymentId && booking.stripeRefundId ? "already_handled" : "unavailable";
    }

    // PENDING, or EXPIRED because the hold ran out: take the spot if there is still room and still time.
    const taken = await tx.booking.count({ where: takenWhere(booking.slotId, now, booking.id) });
    const tooLate = now.getTime() > booking.slot.startsAt.getTime() + LATE_PAYMENT_GRACE_MINUTES * 60_000;
    if (booking.slot.status === "CANCELLED" || taken >= booking.slot.capacity || tooLate) {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          cancelledBy: "SYSTEM",
          cancelReason: tooLate ? "paid_too_late" : "unavailable",
          stripePaymentId: proof.kind === "stripe" ? paymentId : null,
          holdExpiresAt: null,
        },
      });
      await recomputeSlot(tx, booking.slotId, now);
      return "unavailable";
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "PAID",
        paidAt: now,
        stripePaymentId: paymentId,
        holdExpiresAt: null,
        ...(proof.kind === "stripe" ? { stripeSessionId: proof.sessionId, paymentMode: proof.livemode ? "LIVE" : "TEST" } : {}),
      },
    });
    await recomputeSlot(tx, booking.slotId, now);
    return "paid";
  }, TX);

  if (outcome === "paid") {
    await audit(null, "booking_paid", "booking", bookingId, { mode: proof.kind });
    await recordEvent("payment_completed", { entityType: "slot", entityId: head.slotId });
    await notifyBookingPaid(bookingId);
  }

  if (proof.kind === "stripe" && (outcome === "unavailable" || outcome === "duplicate_payment")) {
    const refund = await payments.refundPayment(paymentId, { bookingId });
    if (outcome === "unavailable") {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: "REFUNDED",
          refundAmount: refund.amount,
          stripeRefundId: refund.id,
          refundStatus: payments.refundStatusOf(refund.status),
        },
      });
      await notifyBookingCancelled(bookingId, "UNAVAILABLE", refund.amount);
    }
    await audit(null, `payment_refunded_${outcome}`, "booking", bookingId, { paymentIntent: paymentId });
  }
  return outcome;
}

export type SessionOutcome = PaidOutcome | "ignored" | "unpaid" | "unknown_booking" | "amount_mismatch";

/** Shared by the webhook and the success page. Both ask Stripe; a redirect alone never counts. */
export async function confirmCheckoutSession(session: Stripe.Checkout.Session): Promise<SessionOutcome> {
  const bookingId = session.metadata?.bookingId || session.client_reference_id;
  if (!bookingId) return "ignored";
  if (session.payment_status !== "paid") return "unpaid";
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!paymentIntentId) return "ignored";

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true, amount: true } });
  if (!booking) {
    log.error("payment.unknown_booking", { sessionId: session.id });
    await audit(null, "payment_unknown_booking", "stripe_session", session.id);
    return "unknown_booking";
  }
  if (session.currency !== "eur" || session.amount_total !== booking.amount) {
    log.error("payment.amount_mismatch", { bookingId, expected: booking.amount, received: session.amount_total });
    await audit(null, "payment_amount_mismatch", "booking", bookingId, { received: session.amount_total, currency: session.currency });
    const refund = await payments.refundPayment(paymentIntentId, { bookingId });
    await releaseHold(bookingId, "amount_mismatch");
    // Leave a trace on the booking: the customer paid and was refunded.
    await prisma.booking.updateMany({
      where: { id: bookingId, status: { in: ["PENDING", "EXPIRED"] } },
      data: {
        status: "REFUNDED",
        cancelReason: "amount_mismatch",
        stripePaymentId: paymentIntentId,
        stripeRefundId: refund.id,
        refundStatus: payments.refundStatusOf(refund.status),
      },
    });
    return "amount_mismatch";
  }
  return markPaid(booking.id, { kind: "stripe", paymentIntentId, sessionId: session.id, livemode: session.livemode });
}

/** Frees a held spot. Returns false when the booking was no longer pending. */
export async function releaseHold(bookingId: string, reason: string) {
  const head = await prisma.booking.findUnique({ where: { id: bookingId }, select: { slotId: true, status: true } });
  if (!head || head.status !== "PENDING") return false;
  return prisma.$transaction(async (tx) => {
    await lockSlot(tx, head.slotId);
    const res = await tx.booking.updateMany({
      where: { id: bookingId, status: "PENDING" },
      data: { status: "EXPIRED", cancelReason: reason },
    });
    await recomputeSlot(tx, head.slotId);
    return res.count > 0;
  }, TX);
}

export async function releaseHoldBySession(stripeSessionId: string, reason: string) {
  const booking = await prisma.booking.findUnique({ where: { stripeSessionId }, select: { id: true } });
  return booking ? releaseHold(booking.id, reason) : false;
}

/** Who may act on a booking, and in which capacity. Unrelated users get a 404, not a 403. */
export function bookingRole(
  booking: Pick<Booking, "customerId"> & { slot: { salon: { ownerId: string } } },
  actor: Actor
): CancelReason {
  if (actor.role === "ADMIN") return "ADMIN";
  if (booking.slot.salon.ownerId === actor.id) return "SALON";
  if (booking.customerId === actor.id) return "CUSTOMER";
  throw new ApiError(404, "not_found");
}

export type CancelResult = { status: BookingStatus; refundAmount: number; refundStatus: RefundStatus | null };

/**
 * Customer: until the salon's cancellation window closes, full refund.
 * Salon: until the slot ends, full refund to the customer. Admin: always.
 * The refund is requested first with an idempotency key on the payment, then the booking is
 * finalised under a row lock, so two clicks or two devices never refund twice.
 */
export async function cancelBooking(bookingId: string, actor: Actor, opts: { viaToken?: boolean } = {}): Promise<CancelResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { slot: { include: { salon: true } } },
  });
  if (!booking) throw new ApiError(404, "not_found");
  const by: CancelReason = opts.viaToken ? "CUSTOMER" : bookingRole(booking, actor);

  if (booking.status === "PENDING") {
    await releaseHold(booking.id, `cancelled_by_${by.toLowerCase()}`);
    if (booking.stripeSessionId) await payments.expireCheckoutSession(booking.stripeSessionId);
    return { status: "EXPIRED", refundAmount: 0, refundStatus: null };
  }
  if (booking.status !== "PAID") throw new ApiError(409, "not_cancellable");
  if (booking.checkedInAt && by !== "ADMIN") throw new ApiError(409, "already_checked_in");

  const now = Date.now();
  if (by === "CUSTOMER") {
    const hours = booking.cancellationHours ?? booking.slot.salon.cancellationHours;
    const cutoff = booking.slot.startsAt.getTime() - hours * 3_600_000;
    if (now > cutoff) throw new ApiError(409, "cancel_window_closed");
  }
  if (by === "SALON" && booking.slot.endsAt.getTime() < now) throw new ApiError(409, "not_cancellable");

  let refund: { id: string | null; amount: number; status: RefundStatus | null } = {
    id: null,
    amount: booking.amount,
    status: null,
  };
  if (booking.paymentMode !== "DEMO") {
    if (!booking.stripePaymentId) throw new ApiError(409, "payment_missing");
    try {
      const r = await payments.refundPayment(booking.stripePaymentId, { bookingId: booking.id });
      refund = { id: r.id, amount: r.amount, status: payments.refundStatusOf(r.status) };
    } catch (error) {
      log.error("refund.failed", { bookingId: booking.id, error });
      throw new ApiError(502, "refund_failed");
    }
  }

  const changed = await prisma.$transaction(async (tx) => {
    await lockSlot(tx, booking.slotId);
    await lockBooking(tx, booking.id);
    const fresh = await tx.booking.findUniqueOrThrow({ where: { id: booking.id }, select: { status: true } });
    if (fresh.status !== "PAID") return false;
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: booking.paymentMode === "DEMO" ? "CANCELLED" : "REFUNDED",
        cancelledAt: new Date(),
        cancelledBy: by,
        cancelReason: `cancelled_by_${by.toLowerCase()}`,
        refundAmount: refund.amount,
        stripeRefundId: refund.id,
        refundStatus: refund.status,
      },
    });
    await recomputeSlot(tx, booking.slotId);
    return true;
  }, TX);

  if (changed) {
    await audit(actor.id, "booking_cancelled", "booking", booking.id, { by, refund: refund.amount, mode: booking.paymentMode });
    await recordEvent("booking_cancelled", { entityType: "slot", entityId: booking.slotId });
    await notifyBookingCancelled(booking.id, by, refund.amount);
  }
  const final = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id }, select: { status: true, refundAmount: true, refundStatus: true } });
  return { status: final.status, refundAmount: final.refundAmount ?? 0, refundStatus: final.refundStatus };
}

async function loadForSalon(bookingId: string, actor: Actor) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { slot: { include: { salon: true } } },
  });
  if (!booking) throw new ApiError(404, "not_found");
  if (actor.role !== "ADMIN" && booking.slot.salon.ownerId !== actor.id) throw new ApiError(404, "not_found");
  return booking;
}

/** The customer did not come. The amount stays paid; the customer can no longer review. */
export async function markNoShow(bookingId: string, actor: Actor) {
  const booking = await loadForSalon(bookingId, actor);
  if (booking.status === "NO_SHOW") return booking;
  if (booking.status !== "PAID") throw new ApiError(409, "not_paid");
  if (booking.checkedInAt) throw new ApiError(409, "already_checked_in");
  if (Date.now() < booking.slot.startsAt.getTime() + NO_SHOW_GRACE_MINUTES * 60_000) throw new ApiError(409, "too_early");
  const updated = await prisma.$transaction(async (tx) => {
    await lockSlot(tx, booking.slotId);
    await lockBooking(tx, booking.id);
    const res = await tx.booking.updateMany({
      where: { id: booking.id, status: "PAID", checkedInAt: null },
      data: { status: "NO_SHOW", noShowAt: new Date() },
    });
    if (res.count === 0) throw new ApiError(409, "not_paid");
    return tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
  }, TX);
  await audit(actor.id, "booking_no_show", "booking", booking.id);
  return updated;
}

const CHECKIN_BEFORE_MS = 24 * 3_600_000;
const CHECKIN_AFTER_MS = 48 * 3_600_000;

/** Confirms the visit with the code from the voucher. Idempotent. */
export async function checkIn(code: string, actor: Actor) {
  const booking = await prisma.booking.findUnique({
    where: { confirmationCode: code },
    include: { slot: { include: { salon: true } } },
  });
  // Someone else's code looks exactly like a wrong code.
  if (!booking || (actor.role !== "ADMIN" && booking.slot.salon.ownerId !== actor.id)) throw new ApiError(404, "not_found");
  if (booking.status !== "PAID" && booking.status !== "NO_SHOW") throw new ApiError(409, "not_paid");
  const now = Date.now();
  if (now < booking.slot.startsAt.getTime() - CHECKIN_BEFORE_MS) throw new ApiError(409, "too_early");
  if (now > booking.slot.endsAt.getTime() + CHECKIN_AFTER_MS) throw new ApiError(409, "too_late");
  if (booking.checkedInAt && booking.status === "PAID") return { booking, already: true };
  const updated = await prisma.$transaction(async (tx) => {
    await lockSlot(tx, booking.slotId);
    await lockBooking(tx, booking.id);
    // A refund or cancellation that landed meanwhile wins: never turn it back into PAID.
    const res = await tx.booking.updateMany({
      where: { id: booking.id, status: { in: ["PAID", "NO_SHOW"] } },
      data: { checkedInAt: booking.checkedInAt ?? new Date(), status: "PAID", noShowAt: null },
    });
    if (res.count === 0) throw new ApiError(409, "not_paid");
    return tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: { slot: { include: { salon: true } } } });
  }, TX);
  await audit(actor.id, "booking_checked_in", "booking", booking.id);
  return { booking: updated, already: false };
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

/** A review needs a visit that happened: paid, over, not a no-show, and not too long ago. */
export function reviewEligibility(
  booking: Pick<Booking, "status"> & { slot: { endsAt: Date }; review?: unknown | null },
  now = new Date()
): "ok" | "not_reviewable" | "too_early" | "too_late" | "already_reviewed" {
  if (booking.review) return "already_reviewed";
  if (booking.status !== "PAID") return "not_reviewable";
  if (booking.slot.endsAt > now) return "too_early";
  if (now.getTime() - booking.slot.endsAt.getTime() > REVIEW_WINDOW_DAYS * 86_400_000) return "too_late";
  return "ok";
}

export async function createReview(bookingId: string, actor: Actor, input: { rating: number; comment?: string | null }) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { slot: true, review: true } });
  if (!booking || booking.customerId !== actor.id) throw new ApiError(404, "not_found");
  const eligible = reviewEligibility(booking);
  if (eligible !== "ok") throw new ApiError(409, eligible);
  const review = await prisma.review.create({
    data: {
      bookingId: booking.id,
      salonId: booking.slot.salonId,
      customerId: actor.id,
      rating: input.rating,
      comment: input.comment?.trim() || null,
      verifiedVisit: Boolean(booking.checkedInAt),
    },
  });
  await refreshSalonRating(booking.slot.salonId);
  return review;
}

export type SlotEdit = {
  action: "pause" | "resume" | "edit";
  title?: string;
  description?: string | null;
  startsAt?: Date;
  endsAt?: Date;
  originalPrice?: number;
  discountPrice?: number;
  capacity?: number;
};

/**
 * Pause, resume or edit an offer under the slot lock. Once someone booked, the time, price and
 * treatment they paid for are fixed; adding spots is always allowed.
 */
export async function updateSlot(slotId: string, actor: Actor, edit: SlotEdit) {
  const now = new Date();
  const slot = await prisma.$transaction(async (tx) => {
    await lockSlot(tx, slotId);
    const current = await tx.slot.findUnique({ where: { id: slotId }, include: { salon: true } });
    if (!current || (actor.role !== "ADMIN" && current.salon.ownerId !== actor.id)) throw new ApiError(404, "not_found");
    if (current.status === "CANCELLED" || current.status === "EXPIRED" || current.endsAt <= now) throw new ApiError(409, "slot_closed");

    if (edit.action === "pause") {
      if (current.status !== "OPEN" && current.status !== "BOOKED") throw new ApiError(409, "not_open");
      return tx.slot.update({ where: { id: slotId }, data: { status: "PAUSED" } });
    }
    if (edit.action === "resume") {
      if (current.status !== "PAUSED") throw new ApiError(409, "not_paused");
      await tx.slot.update({ where: { id: slotId }, data: { status: "OPEN" } });
      await recomputeSlot(tx, slotId, now);
      return tx.slot.findUniqueOrThrow({ where: { id: slotId } });
    }

    const taken = await tx.booking.count({ where: takenWhere(slotId, now) });
    const next = {
      startsAt: edit.startsAt ?? current.startsAt,
      endsAt: edit.endsAt ?? current.endsAt,
      originalPrice: edit.originalPrice ?? current.originalPrice,
      discountPrice: edit.discountPrice ?? current.discountPrice,
      capacity: edit.capacity ?? current.capacity,
    };
    const timingChanged =
      next.startsAt.getTime() !== current.startsAt.getTime() || next.endsAt.getTime() !== current.endsAt.getTime();
    const termsChanged =
      timingChanged ||
      next.originalPrice !== current.originalPrice ||
      next.discountPrice !== current.discountPrice ||
      (edit.title !== undefined && edit.title !== current.title);
    if (taken > 0 && (termsChanged || next.capacity < current.capacity)) throw new ApiError(409, "slot_has_bookings");
    const rule = checkSlotValues(next, now, { timing: timingChanged });
    if (rule) throw new ApiError(400, rule);

    await tx.slot.update({
      where: { id: slotId },
      data: {
        ...next,
        title: edit.title ?? current.title,
        description: edit.description === undefined ? current.description : edit.description || null,
        spotsLeft: Math.max(0, next.capacity - taken),
      },
    });
    await recomputeSlot(tx, slotId, now);
    return tx.slot.findUniqueOrThrow({ where: { id: slotId } });
  }, TX);
  const action = edit.action === "edit" ? "slot_updated" : edit.action === "pause" ? "slot_paused" : "slot_resumed";
  await audit(actor.id, action, "slot", slotId);
  return slot;
}

/**
 * Withdraw an offer. The slot is closed under the lock first, so no new checkout can start; then every
 * paid customer is refunded and every open checkout closed. A refund that fails is retried by the cron.
 */
export async function cancelSlot(slotId: string, actor: Actor) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await lockSlot(tx, slotId);
    const slot = await tx.slot.findUnique({ where: { id: slotId }, include: { salon: true } });
    if (!slot || (actor.role !== "ADMIN" && slot.salon.ownerId !== actor.id)) throw new ApiError(404, "not_found");
    if (slot.status === "CANCELLED") return;
    if (slot.startsAt <= now) throw new ApiError(409, "slot_started");
    await tx.slot.update({ where: { id: slotId }, data: { status: "CANCELLED" } });
  }, TX);

  const open = await prisma.booking.findMany({
    where: { slotId, status: { in: ["PENDING", "PAID"] } },
    select: { id: true, status: true, stripeSessionId: true },
  });
  let refunded = 0;
  let failed = 0;
  for (const b of open) {
    try {
      if (b.status === "PENDING") {
        await releaseHold(b.id, "slot_cancelled");
        if (b.stripeSessionId) await payments.expireCheckoutSession(b.stripeSessionId);
      } else {
        await cancelBooking(b.id, actor);
        refunded++;
      }
    } catch (error) {
      failed++;
      log.error("slot_cancel.booking_failed", { bookingId: b.id, error });
    }
  }
  await audit(actor.id, "slot_cancelled", "slot", slotId, { refunded, failed });
  return { refunded, failed };
}

/** Paid bookings left on a withdrawn offer because a refund failed earlier. Called by the cron. */
export async function retryCancelledSlotRefunds(limit = 20) {
  const stuck = await prisma.booking.findMany({
    where: { status: "PAID", slot: { status: "CANCELLED" } },
    select: { id: true },
    take: limit,
  });
  let done = 0;
  for (const b of stuck) {
    try {
      await cancelBooking(b.id, { id: "system", role: "ADMIN" });
      done++;
    } catch (error) {
      log.error("slot_cancel.retry_failed", { bookingId: b.id, error });
    }
  }
  return done;
}
