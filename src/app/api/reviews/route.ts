import { NextResponse } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createReview } from "@/lib/bookings";

const schema = z.object({
  bookingId: z.string().min(1).max(40),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(800).optional(),
});

/** Only the customer of a paid, finished (not no-show) booking, once, within the review window. */
export const POST = route(async (req) => {
  const user = await requireUser();
  await enforceRateLimit(`review:${user.id}`, 10, 60 * 60);
  const body = await parseBody(req, schema);
  const review = await createReview(body.bookingId, user, body);
  return NextResponse.json({ ok: true, id: review.id });
});
