import { prisma } from "./prisma";
import { ApiError } from "./errors";
import { audit } from "./audit";

/** Everything GatVuller holds about a person (GDPR art. 15/20). */
export async function exportAccount(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, phone: true, role: true, locale: true, marketingOptIn: true, termsAcceptedAt: true, createdAt: true,
      bookings: {
        select: {
          id: true, confirmationCode: true, status: true, amount: true, paymentMode: true, createdAt: true,
          customerName: true, customerEmail: true, customerPhone: true,
          slot: { select: { title: true, startsAt: true, salon: { select: { name: true } } } },
        },
      },
      reviews: { select: { rating: true, comment: true, createdAt: true } },
      favorites: { select: { salon: { select: { name: true } }, createdAt: true } },
      alerts: { select: { email: true, city: true, category: true, active: true, createdAt: true } },
      salons: { select: { name: true, address: true, city: true, status: true, createdAt: true } },
    },
  });
  return { exportedAt: new Date().toISOString(), ...user };
}

/**
 * Right to erasure. Bookings stay as anonymous financial records (amounts, dates); contact data goes.
 * Refused while a paid visit is still ahead or while the person runs a salon (payouts must be settled first).
 */
export async function anonymizeAccount(userId: string) {
  const upcoming = await prisma.booking.count({ where: { customerId: userId, status: "PAID", slot: { endsAt: { gt: new Date() } } } });
  if (upcoming > 0) throw new ApiError(409, "upcoming_bookings");
  const salons = await prisma.salon.count({ where: { ownerId: userId, status: { not: "SUSPENDED" } } });
  if (salons > 0) throw new ApiError(409, "owns_salon");
  const gone = `deleted-${userId}@invalid.local`;
  await prisma.$transaction([
    prisma.booking.updateMany({ where: { customerId: userId }, data: { customerName: "Deleted user", customerEmail: gone, customerPhone: null } }),
    prisma.review.updateMany({ where: { customerId: userId }, data: { comment: null } }),
    prisma.slotAlert.deleteMany({ where: { userId } }),
    prisma.favoriteSalon.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: { email: gone, name: "Deleted user", phone: null, passwordHash: null, referralCode: null, marketingOptIn: false, anonymizedAt: new Date() },
    }),
  ]);
  await audit(userId, "account_anonymized", "user", userId);
}
