import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { verifyBookingToken } from "@/lib/tokens";
import { icsStamp } from "@/lib/time";
import { appUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

/** RFC 5545 TEXT: backslash, semicolon, comma and newlines are escaped, so a title cannot add properties. */
function icsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets are folded with CRLF + space. */
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest, "utf8") > 75) {
    let cut = 74;
    while (Buffer.byteLength(rest.slice(0, cut), "utf8") > 74) cut--;
    out.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = new URL(req.url).searchParams.get("t");
  const user = await getCurrentUser();
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { slot: { include: { salon: true } } },
  });
  if (!booking) return new Response("Not found", { status: 404 });
  const allowed = booking.customerId === user?.id || verifyBookingToken(id, token) || user?.role === "ADMIN";
  // Someone else's booking looks exactly like a booking that does not exist.
  if (!allowed) return new Response("Not found", { status: 404 });

  if (booking.status !== "PAID") return new Response("Booking is not confirmed", { status: 409 });

  const slot = booking.slot;
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GatVuller//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${booking.id}@gatvuller`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(slot.startsAt)}`,
    `DTEND:${icsStamp(slot.endsAt)}`,
    `SUMMARY:${icsText(`${slot.title} — ${slot.salon.name}`)}`,
    `LOCATION:${icsText(slot.salon.address)}`,
    `DESCRIPTION:${icsText(`${booking.confirmationCode}\n${appUrl()}/boekingen/${booking.id}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="gatvuller-${booking.confirmationCode}.ics"`,
    },
  });
}
