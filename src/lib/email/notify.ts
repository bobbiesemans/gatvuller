import type { Booking, Salon, Slot, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/config";
import { localizedPath } from "@/i18n/config";
import { bookingToken } from "@/lib/tokens";
import { sendEmail } from "./send";
import {
  bookingCancelledEmail,
  bookingCancelledSalonEmail,
  bookingConfirmedEmail,
  bookingReceivedEmail,
  reviewRequestEmail,
  type BookingEmailView,
  type CancelReason,
} from "./templates";

export type { CancelReason };

type FullBooking = Booking & { slot: Slot & { salon: Salon & { owner: User } } };

export const absoluteUrl = (locale: string, path: string) => `${appUrl()}${localizedPath(locale, path)}`;

export function voucherUrl(booking: { id: string; locale: string }) {
  return absoluteUrl(booking.locale, `/boekingen/${booking.id}?t=${bookingToken(booking.id)}`);
}

export function calendarUrl(bookingId: string) {
  return `${appUrl()}/api/bookings/${bookingId}/ics?t=${bookingToken(bookingId)}`;
}

function toView(b: FullBooking): BookingEmailView {
  return {
    code: b.confirmationCode,
    locale: b.locale,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    customerPhone: b.customerPhone,
    amount: b.amount,
    feeAmount: b.feeAmount,
    feePercent: b.feePercent,
    paymentMode: b.paymentMode,
    slot: { title: b.slot.title, startsAt: b.slot.startsAt, endsAt: b.slot.endsAt, originalPrice: b.slot.originalPrice },
    salon: { name: b.slot.salon.name, address: b.slot.salon.address, cancellationHours: b.slot.salon.cancellationHours },
  };
}

async function loadBooking(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: { slot: { include: { salon: { include: { owner: true } } } } },
  });
}

const ownerReachable = (owner: User) => !owner.anonymizedAt && owner.email;

export async function notifyBookingPaid(bookingId: string) {
  const b = await loadBooking(bookingId);
  if (!b) return;
  const view = toView(b);
  await sendEmail({
    to: b.customerEmail,
    template: "booking_confirmed",
    ...bookingConfirmedEmail(view, { voucher: voucherUrl(b), calendar: calendarUrl(b.id) }),
  });
  const owner = b.slot.salon.owner;
  if (ownerReachable(owner)) {
    await sendEmail({
      to: owner.email,
      template: "booking_received",
      ...bookingReceivedEmail(view, owner.locale, absoluteUrl(owner.locale, "/dashboard/boekingen")),
    });
  }
}

export async function notifyBookingCancelled(bookingId: string, reason: CancelReason, refundAmount: number) {
  const b = await loadBooking(bookingId);
  if (!b) return;
  const view = toView(b);
  await sendEmail({
    to: b.customerEmail,
    template: "booking_cancelled",
    ...bookingCancelledEmail(view, reason, refundAmount, absoluteUrl(b.locale, "/slots")),
  });
  const owner = b.slot.salon.owner;
  if (reason !== "SALON" && reason !== "EXPIRED" && ownerReachable(owner)) {
    await sendEmail({
      to: owner.email,
      template: "booking_cancelled_salon",
      ...bookingCancelledSalonEmail(view, owner.locale, absoluteUrl(owner.locale, "/dashboard/boekingen")),
    });
  }
}

export async function sendReviewRequest(bookingId: string) {
  const b = await loadBooking(bookingId);
  if (!b) return;
  await sendEmail({
    to: b.customerEmail,
    template: "review_request",
    ...reviewRequestEmail(b.locale, b.customerName, b.slot.salon.name, `${voucherUrl(b)}#review`),
  });
}
