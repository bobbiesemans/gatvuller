import { NextResponse } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import { stripeConfigured } from "@/lib/stripe";
import { requireOwnedSalon } from "@/lib/ownership";
import { createConnectedAccount, onboardingLink, expressDashboardLink, retrieveConnectState } from "@/lib/payments";
import { audit } from "@/lib/audit";

const schema = z.object({ salonId: z.string().min(1).max(40), action: z.enum(["onboard", "dashboard", "refresh"]).default("onboard") });

/** Stripe Connect Express for payouts. Only the owner (or an admin) of the salon. */
export const POST = route(async (req) => {
  const user = await requireUser(["SALON_OWNER", "ADMIN"]);
  if (!stripeConfigured()) throw new ApiError(503, "payments_not_configured");
  const body = await parseBody(req, schema);
  const salon = await requireOwnedSalon(user, body.salonId);
  if (salon.isDemo) throw new ApiError(409, "demo_salon");

  let accountId = salon.stripeAccountId;
  if (!accountId) {
    const account = await createConnectedAccount(salon, user.email);
    accountId = account.id;
    await prisma.salon.update({ where: { id: salon.id }, data: { stripeAccountId: accountId } });
    await audit(user.id, "stripe_account_created", "salon", salon.id);
  }
  const state = await retrieveConnectState(accountId);
  await prisma.salon.update({
    where: { id: salon.id },
    data: { stripeChargesEnabled: state.chargesEnabled, stripePayoutsEnabled: state.payoutsEnabled, stripeDetailsSubmitted: state.detailsSubmitted },
  });
  if (body.action === "refresh") return NextResponse.json({ state });
  const url = body.action === "dashboard" && state.detailsSubmitted ? await expressDashboardLink(accountId) : await onboardingLink(accountId, salon.id);
  return NextResponse.json({ url, state });
});
