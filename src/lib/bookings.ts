import type { Booking, BookingStatus, Prisma, RefundStatus, Role } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "./prisma";
import { ApiError } from "./errors";
import { randomCode } from "./codes";
import { isDemoMode, PAYMENT_HOLD_MINUTES, PLATFORM_FEE_PERCENT, REVIEW_WINDOW_DAYS } from "./config";
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
    const slot = await tx.slot.findUnique({ where: { id: input.slotId }, include: { salon: true } });
    if (!slot) throw new ApiError(404, "not_found");
    if (!isSalonBookable(slot.salon)) throw new ApiError(409, "slot_unavailable");
    if (slot.salon.ownerId === input.customer.id) throw new ApiError(409, "own_salon");
    if (slot.status !== "OPEN" || slot.startsAt < bookingLeadCutoff(now)) throw new ApiError(409, "slot_unavailable");

    await tx.booking.updateMany({
      where: { slotId: slot.id, status: "PENDING", holdExpiresAt: { lte: now } },
      data: { status: "EXPIRED", cancelReason: "hold_expired" },
    });

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

    // PENDING, or EXPIRED because the hold ran out: take the spot if there is still room.
    const taken = await tx.booking.count({ where: takenWhere(booking.slotId, now, booking.id) });
    if (booking.slot.status === "CANCELLED" || taken >= booking.slot.capacity) {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          cancelledBy: "SYSTEM",
          cancelReason: "unavailable",
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
    const refund = await payments.refundPayment(paymentId, { bookingId, reason: outcome });
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
    await payments.refundPayment(paymentIntentId, { bookingId, reason: "amount_mismatch" });
    await releaseHold(bookingId, "amount_mismatch");
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
    const cutoff = booking.slot.startsAt.getTime() - booking.slot.salon.cancellationHours * 3_600_000;
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
      const r = await payments.refundPayment(booking.stripePaymentId, { bookingId: booking.id, reason: `cancelled_by_${by.toLowerCase()}` });
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
  if (booking.slot.startsAt.getTime() > Date.now()) throw new ApiError(409, "too_early");
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "NO_SHOW", noShowAt: new Date() },
  });
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
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { checkedInAt: booking.checkedInAt ?? new Date(), status: "PAID", noShowAt: null },
    include: { slot: { include: { salon: true } } },
  });
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
