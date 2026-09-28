import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyBookingToken } from "@/lib/tokens";
import { retrieveCheckoutSession } from "@/lib/payments";
import { confirmCheckoutSession } from "@/lib/bookings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Betaalstatus", robots: { index: false } };

/** Stripe returns here. The redirect proves nothing: we ask Stripe for the session ourselves. */
export default async function StatusPage({ searchParams }: { searchParams: Promise<{ b?: string; t?: string; session_id?: string }> }) {
  const sp = await searchParams;
  if (!sp.b || !verifyBookingToken(sp.b, sp.t)) redirect("/boekingen");
  const booking = await prisma.booking.findUnique({ where: { id: sp.b }, select: { id: true, status: true, stripeSessionId: true } });
  if (!booking) redirect("/boekingen");
  const sessionId = booking.stripeSessionId;
  if (booking.status === "PENDING" && sessionId && (!sp.session_id || sp.session_id === sessionId)) {
    const session = await retrieveCheckoutSession(sessionId);
    if (session?.status === "complete") await confirmCheckoutSession(session);
  }
  redirect(`/boeking/succes?bookingId=${booking.id}&t=${sp.t}`);
}
