import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { verifyBookingToken } from "@/lib/tokens";
import { expireCheckoutSession, retrieveCheckoutSession } from "@/lib/payments";
import { confirmCheckoutSession, releaseHold } from "@/lib/bookings";
import { log } from "@/lib/log";
import { StatusPoller } from "@/components/status-poller";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.status");
  return { title: t("metaTitle"), robots: { index: false, follow: false }, alternates: { canonical: "/boeking/status" } };
}

const select = { id: true, status: true, stripeSessionId: true } as const;

/**
 * Stripe returns here, both after paying and after "back". The redirect proves nothing: the server asks
 * Stripe for the session itself. "Back" gives the spot back at once instead of holding it for half an hour.
 */
export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string; t?: string; session_id?: string; afgebroken?: string }>;
}) {
  const sp = await searchParams;
  if (!sp.b || !verifyBookingToken(sp.b, sp.t)) redirect("/boekingen");
  const token = encodeURIComponent(sp.t || "");
  let booking = await prisma.booking.findUnique({ where: { id: sp.b }, select });
  if (!booking) redirect("/boekingen");

  const sessionId = booking.stripeSessionId;
  const session =
    booking.status === "PENDING" && sessionId && (!sp.session_id || sp.session_id === sessionId)
      ? await retrieveCheckoutSession(sessionId)
      : null;
  const paid = session?.status === "complete" && session.payment_status === "paid";

  if (paid && session) {
    // A failed confirmation is retried by the webhook and by the poller below.
    await confirmCheckoutSession(session).catch((error) => log.error("status.confirm_failed", { bookingId: sp.b, error }));
    booking = await prisma.booking.findUnique({ where: { id: sp.b }, select });
    if (!booking) redirect("/boekingen");
  } else if (sp.afgebroken && booking.status === "PENDING") {
    await releaseHold(booking.id, "checkout_cancelled");
    if (sessionId) await expireCheckoutSession(sessionId);
    redirect(`/boeking/annuleren?b=${booking.id}&t=${token}`);
  }

  if (booking.status !== "PENDING") redirect(`/boeking/succes?bookingId=${booking.id}&t=${token}`);
  return <StatusPoller bookingId={booking.id} token={sp.t || ""} />;
}
