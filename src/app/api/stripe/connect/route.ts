import { NextResponse } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { appUrl } from "@/lib/config";

const schema = z.object({ salonId: z.string().min(1) });

export const POST = route(async (req) => {
  const user = await requireUser(["SALON_OWNER", "ADMIN"]);
  if (!stripeConfigured()) throw new ApiError(503, "payments_not_configured");
  const body = await parseBody(req, schema);
  const salon = await prisma.salon.findFirst({
    where: { id: body.salonId, ...(user.role === "ADMIN" ? {} : { ownerId: user.id }) },
  });
  if (!salon) throw new ApiError(404, "not_found");

  const stripe = getStripe()!;
  let accountId = salon.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: salon.country === "NL" ? "NL" : "BE",
      email: user.email,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { salonId: salon.id },
    });
    accountId = account.id;
    await prisma.salon.update({ where: { id: salon.id }, data: { stripeAccountId: accountId } });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl()}/dashboard?stripe=refresh`,
    return_url: `${appUrl()}/dashboard?stripe=return`,
    type: "account_onboarding",
  });
  return NextResponse.json({ url: link.url });
});
