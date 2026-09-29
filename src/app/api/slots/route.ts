import { NextResponse, after } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { notifySlotAlerts } from "@/lib/alerts";
import { enforceRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { parseSlotInstant } from "@/lib/time";
import { requireOwnedSalon } from "@/lib/ownership";
import { SLOT_LIMITS } from "@/lib/config";
import { recordEvent } from "@/lib/analytics";
import { checkSlotValues } from "@/lib/slot-rules";
import { cancelSlot, updateSlot } from "@/lib/bookings";
import { slotVisibility } from "@/lib/marketplace";

const cents = z.number().int().positive().max(10_000_000);

const createSchema = z.object({
  salonId: z.string().min(1).max(40),
  templateId: z.string().max(40).optional().nullable(),
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).optional().nullable(),
  startsAt: z.string().min(10).max(40),
  endsAt: z.string().min(10).max(40),
  originalPrice: cents,
  discountPrice: cents,
  capacity: z.number().int().min(1).max(SLOT_LIMITS.maxCapacity).default(1),
});

const patchSchema = z.object({
  id: z.string().min(1).max(40),
  action: z.enum(["pause", "resume", "edit"]).default("edit"),
  title: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(400).optional().nullable(),
  startsAt: z.string().min(10).max(40).optional(),
  endsAt: z.string().min(10).max(40).optional(),
  originalPrice: cents.optional(),
  discountPrice: cents.optional(),
  capacity: z.number().int().min(1).max(SLOT_LIMITS.maxCapacity).optional(),
});

function instant(value: string | undefined) {
  if (value === undefined) return undefined;
  const parsed = parseSlotInstant(value);
  if (!parsed) throw new ApiError(400, "invalid_time");
  return parsed;
}

/** Publish a free slot. Role and ownership come from the database; prices are validated here, never trusted. */
export const POST = route(async (req) => {
  const user = await requireUser(["SALON_OWNER", "ADMIN"]);
  await enforceRateLimit(`slot:${user.id}`, 30, 60 * 60);
  const data = await parseBody(req, createSchema);
  const startsAt = instant(data.startsAt)!;
  const endsAt = instant(data.endsAt)!;
  const rule = checkSlotValues({ startsAt, endsAt, originalPrice: data.originalPrice, discountPrice: data.discountPrice, capacity: data.capacity });
  if (rule) throw new ApiError(400, rule);

  const salon = await requireOwnedSalon(user, data.salonId);
  if (salon.status !== "ACTIVE") throw new ApiError(409, "salon_not_active");
  const open = await prisma.slot.count({
    where: { salonId: salon.id, status: { in: ["OPEN", "BOOKED", "PAUSED"] }, endsAt: { gt: new Date() } },
  });
  if (open >= SLOT_LIMITS.maxOpenPerSalon) throw new ApiError(409, "too_many_open_slots");
  const template = data.templateId
    ? await prisma.serviceTemplate.findFirst({ where: { id: data.templateId, salonId: salon.id }, select: { id: true } })
    : null;
  const isFirst = (await prisma.slot.count({ where: { salonId: salon.id } })) === 0;

  const slot = await prisma.slot.create({
    data: {
      salonId: salon.id,
      templateId: template?.id ?? null,
      title: data.title,
      description: data.description || null,
      startsAt,
      endsAt,
      originalPrice: data.originalPrice,
      discountPrice: data.discountPrice,
      capacity: data.capacity,
      spotsLeft: data.capacity,
      status: "OPEN",
    },
  });

  await audit(user.id, "slot_published", "slot", slot.id, { salonId: salon.id });
  await recordEvent(isFirst ? "first_slot_published" : "slot_published", { entityType: "slot", entityId: slot.id });
  // Alerts go out after the response, so publishing stays fast.
  after(() => notifySlotAlerts(slot.id).catch(() => undefined));
  return NextResponse.json({ slot, visibility: slotVisibility(slot, salon) });
});

/** Pause, resume or edit an offer. Runs under the slot lock, so it cannot race a checkout. */
export const PATCH = route(async (req) => {
  const user = await requireUser(["SALON_OWNER", "ADMIN"]);
  await enforceRateLimit(`slot-edit:${user.id}`, 120, 60 * 60);
  const data = await parseBody(req, patchSchema);
  const slot = await updateSlot(data.id, user, {
    action: data.action,
    title: data.title,
    description: data.description,
    startsAt: instant(data.startsAt),
    endsAt: instant(data.endsAt),
    originalPrice: data.originalPrice,
    discountPrice: data.discountPrice,
    capacity: data.capacity,
  });
  return NextResponse.json({ slot });
});

/** Withdraw an offer: nobody can book it any more and everyone who paid is refunded. */
export const DELETE = route(async (req) => {
  const user = await requireUser(["SALON_OWNER", "ADMIN"]);
  await enforceRateLimit(`slot-edit:${user.id}`, 120, 60 * 60);
  const id = new URL(req.url).searchParams.get("id");
  if (!id || id.length > 40) throw new ApiError(400, "invalid_input");
  const result = await cancelSlot(id, user);
  return NextResponse.json({ ok: true, ...result });
});
