import { NextResponse } from "next/server";
import { z } from "zod";
import type { SalonStatus } from "@prisma/client";
import { route, requireUser, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { recordEvent } from "@/lib/analytics";
import { sendEmail } from "@/lib/email/send";
import { salonApprovedEmail, salonSuspendedEmail } from "@/lib/email/templates";
import { absoluteUrl } from "@/lib/email/notify";
import { withdrawSalonOffers } from "@/lib/bookings";
import { paymentsProvider } from "@/lib/stripe";

const schema = z.object({
  salonId: z.string().min(1).max(40),
  action: z.enum(["approve", "suspend", "reactivate"]),
  reason: z.string().trim().max(300).optional(),
});

/** Which statuses each action may start from. */
const FROM: Record<"approve" | "suspend" | "reactivate", SalonStatus[]> = {
  approve: ["PENDING"],
  suspend: ["ACTIVE", "PENDING"],
  reactivate: ["SUSPENDED"],
};

/** Admin only: verification is a person checking the business, and every step is logged in the audit trail. */
export const POST = route(async (req) => {
  const admin = await requireUser(["ADMIN"]);
  const body = await parseBody(req, schema);
  const salon = await prisma.salon.findUnique({ where: { id: body.salonId }, include: { owner: true } });
  if (!salon) throw new ApiError(404, "not_found");
  if (!FROM[body.action].includes(salon.status)) throw new ApiError(409, "invalid_transition");

  const owner = salon.owner;
  const reachable = !owner.anonymizedAt;
  let withdrawn: { slots: number; refunded: number; failed: number } | null = null;

  if (body.action === "suspend") {
    if (!body.reason) throw new ApiError(400, "reason_required");
    // Suspended first, so no new checkout can start while the existing offers are withdrawn.
    await prisma.salon.update({ where: { id: salon.id }, data: { status: "SUSPENDED", suspendedReason: body.reason } });
    withdrawn = await withdrawSalonOffers(salon.id, admin);
    if (reachable) {
      await sendEmail({
        to: owner.email,
        template: "salon_suspended",
        ...salonSuspendedEmail(owner.locale, owner.name, salon.name, body.reason, absoluteUrl(owner.locale, "/contact"), withdrawn.refunded),
      });
    }
  } else {
    const now = new Date();
    await prisma.salon.update({
      where: { id: salon.id },
      data: { status: "ACTIVE", verified: true, verifiedAt: salon.verifiedAt ?? now, suspendedReason: null },
    });
    if (body.action === "approve") {
      await recordEvent("salon_approved", { entityType: "salon", entityId: salon.id });
      if (reachable) {
        await sendEmail({
          to: owner.email,
          template: "salon_approved",
          ...salonApprovedEmail(
            owner.locale,
            owner.name,
            salon.name,
            absoluteUrl(owner.locale, "/dashboard"),
            paymentsProvider() === "stripe" && !salon.stripeChargesEnabled
          ),
        });
      }
    }
  }
  await audit(admin.id, `salon_${body.action}`, "salon", salon.id, {
    ...(body.reason ? { reason: body.reason } : {}),
    ...(withdrawn ? { withdrawn } : {}),
  });
  return NextResponse.json({ ok: true, ...(withdrawn ? { withdrawn } : {}) });
});
