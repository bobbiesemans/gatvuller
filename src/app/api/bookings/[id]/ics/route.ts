import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { verifyBookingToken } from "@/lib/tokens";
import { icsStamp } from "@/lib/time";
import { appUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = new URL(req.url).searchParams.get("t");
  const user = await getCurrentUser();
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { slot: { include: { salon: true } } },
  });
  if (!booking) return new Response("Niet gevonden", { status: 404 });
  const allowed = booking.customerId === user?.id || verifyBookingToken(id, token) || user?.role === "ADMIN";
  if (!allowed) return new Response("Geen toegang", { status: 403 });

  const slot = booking.slot;
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GatVuller//Boeking//NL",
    "BEGIN:VEVENT",
    `UID:${booking.id}@gatvuller`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(slot.startsAt)}`,
    `DTEND:${icsStamp(slot.endsAt)}`,
    `SUMMARY:${slot.title} — ${slot.salon.name}`,
    `LOCATION:${slot.salon.address}`,
    `DESCRIPTION:Bevestigingscode ${booking.confirmationCode}\\n${appUrl()}/boekingen/${booking.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="gatvuller-${booking.confirmationCode}.ics"`,
    },
  });
}
