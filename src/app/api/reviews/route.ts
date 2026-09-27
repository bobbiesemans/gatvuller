import { NextResponse } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import { refreshSalonRating } from "@/lib/bookings";

const schema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(800).optional(),
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, schema);
  const booking = await prisma.booking.findUnique({
    where: { id: body.bookingId },
    include: { review: true, slot: true },
  });
  if (!booking || booking.customerId !== user.id) throw new ApiError(404, "not_found");
  if (booking.status !== "PAID" && booking.status !== "NO_SHOW") throw new ApiError(409, "not_reviewable");
  if (booking.slot.endsAt > new Date()) throw new ApiError(409, "too_early");
  if (booking.review) throw new ApiError(409, "already_reviewed");

  const review = await prisma.review.create({
    data: {
      bookingId: booking.id,
      salonId: booking.slot.salonId,
      customerId: user.id,
      rating: body.rating,
      comment: body.comment || null,
    },
  });
  await refreshSalonRating(booking.slot.salonId);
  return NextResponse.json({ ok: true, id: review.id });
});
