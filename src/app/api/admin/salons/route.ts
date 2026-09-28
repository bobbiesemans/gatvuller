import { NextResponse } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { recordEvent } from "@/lib/analytics";
import { sendEmail } from "@/lib/email/send";
import { salonApprovedEmail } from "@/lib/email/templates";
import { absoluteUrl } from "@/lib/email/notify";
import { paymentsProvider } from "@/lib/stripe";

const schema = z.object({
  salonId: z.string().min(1).max(40),
  action: z.enum(["approve", "suspend", "reactivate"]),
  reason: z.string().trim().max(300).optional(),
});

/** Admin only: verification is a person checking the business, logged in the audit trail. */
export const POST = route(async (req) => {
  const admin = await requireUser(["ADMIN"]);
  const body = await parseBody(req, schema);
  const salon = await prisma.salon.findUnique({ where: { id: body.salonId }, include: { owner: true } });
  if (!salon) throw new ApiError(404, "not_found");

  if (body.action === "suspend") {
    if (!body.reason) throw new ApiError(400, "reason_required");
    await prisma.$transaction([
      prisma.salon.update({ where: { id: salon.id }, data: { status: "SUSPENDED", suspendedReason: body.reason } }),
      prisma.slot.updateMany({ where: { salonId: salon.id, status: "OPEN" }, data: { status: "PAUSED" } }),
    ]);
  } else {
    const now = new Date();
    await prisma.salon.update({
      where: { id: salon.id },
      data: { status: "ACTIVE", verified: true, verifiedAt: salon.verifiedAt ?? now, suspendedReason: null },
    });
    if (body.action === "approve" && salon.status === "PENDING") {
      await recordEvent("salon_approved", { entityType: "salon", entityId: salon.id });
      if (!salon.owner.anonymizedAt) {
        await sendEmail({
          to: salon.owner.email,
          template: "salon_approved",
          ...salonApprovedEmail(salon.owner.locale, salon.owner.name, salon.name, absoluteUrl(salon.owner.locale, "/dashboard"), paymentsProvider() === "stripe" && !salon.stripeChargesEnabled),
        });
      }
    }
  }
  await audit(admin.id, `salon_${body.action}`, "salon", salon.id, body.reason ? { reason: body.reason } : undefined);
  return NextResponse.json({ ok: true });
});
