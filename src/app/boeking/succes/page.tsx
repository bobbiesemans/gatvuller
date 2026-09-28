import { getLocale } from "next-intl/server";
import { formatInZone } from "@/lib/time";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { verifyBookingToken } from "@/lib/tokens";
import { appUrl } from "@/lib/config";
import { formatEuro, shortCode, discountPercent } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingQr } from "@/components/booking-qr";
import { MiniMap } from "@/components/map/mini-map";
import { MapPin, Clock, Info } from "lucide-react";
import { CopyCodeButton } from "@/components/copy-code-button";
import { TrackOnMount } from "@/components/track-on-mount";

export const dynamic = "force-dynamic";
export const metadata = { title: "Boeking bevestigd" };

export default async function SuccesPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string; demo?: string; t?: string }>;
}) {
  const lc = await getLocale();
  const sp = await searchParams;
  const me = await getCurrentUser();
  const session = me ? { user: me } : null;
  const booking = sp.bookingId
    ? await prisma.booking.findUnique({
        where: { id: sp.bookingId },
        include: { slot: { include: { salon: true } }, review: true },
      })
    : null;
  if (booking) {
    const allowed =
      session?.user?.id === booking.customerId ||
      session?.user?.role === "ADMIN" ||
      verifyBookingToken(booking.id, sp.t);
    if (!allowed) redirect("/login?callbackUrl=/boekingen");
  }

  const code = booking ? shortCode(booking.confirmationCode) : null;
  const paid = booking?.status === "PAID";
  const pending = booking?.status === "PENDING";
  // The salon scans with any phone camera and lands on its own check-in screen (login and ownership required there).
  const qrValue = booking ? `${appUrl()}/dashboard/boekingen?code=${booking.confirmationCode}` : "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {paid && <TrackOnMount name="payment_completed" entityId={booking.id} />}
      <div className="text-center mb-8">
        <Badge variant={paid ? "success" : "default"} className="mb-3">
          {paid ? "Betaald" : pending ? "Betaling nog niet bevestigd" : "Status onbekend"}
        </Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {paid ? "Je afspraak is gereserveerd" : pending ? "We wachten op de betaalbevestiging" : "Boeking"}
        </h1>
        <p className="mt-2 text-slate-500">
          {paid ? "Toon de code bij aankomst." : "Een redirect alleen is geen betaling. Vernieuw deze pagina zodra Stripe bevestigt."}
        </p>
      </div>

      {booking?.stripePaymentId === "demo" && (
        <p className="mb-6 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-950">
          Testmodus: deze betaling is gesimuleerd. In productie telt alleen een bevestiging van Stripe.
        </p>
      )}

      {booking ? (
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="bg-[#b4492b] px-6 py-5 text-white">
              <p className="text-sm text-[#f8ebe5]">Bevestigingscode</p>
              <p className="mt-1 text-3xl font-extrabold tracking-[0.2em]">{code}</p>
              <p className="mt-1 text-xs text-[#f8ebe5]/90">Volledig: {booking.confirmationCode}</p>
              <div className="mt-3"><CopyCodeButton code={booking.confirmationCode} /></div>
            </div>
            <CardContent className="p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              <BookingQr value={qrValue} />
              <div className="space-y-2 text-sm text-slate-600 flex-1">
                <p className="text-lg font-bold text-slate-900">{booking.slot.title}</p>
                <p>
                  {booking.slot.salon.name} · ★ {booking.slot.salon.ratingCount > 0 ? booking.slot.salon.ratingAvg.toFixed(1) : "Nieuw"}
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-[#b4492b] shrink-0" />
                  {booking.slot.salon.address}
                </p>
                <p className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 text-[#b4492b] shrink-0" />
                  {formatInZone(booking.slot.startsAt, lc, "dayMonth")} · {formatInZone(booking.slot.startsAt, lc, "time")} –{" "}
                  {formatInZone(booking.slot.endsAt, lc, "time")}
                </p>
                <div className="pt-2 flex items-end gap-3">
                  <div>
                    <p className="text-2xl font-extrabold text-[#b4492b]">
                      {formatEuro(booking.amount)}
                    </p>
                    <p className="text-xs text-slate-400">
                      -{discountPercent(booking.slot.originalPrice, booking.slot.discountPrice)}% t.o.v.{" "}
                      {formatEuro(booking.slot.originalPrice)}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">Zaak betaalt {formatEuro(booking.feeAmount)} platformkosten. Jij betaalde {formatEuro(booking.amount)}.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="font-bold text-slate-900 mb-2">Locatie & aankomstvenster</h2>
            <MiniMap
              lat={booking.slot.salon.lat}
              lng={booking.slot.salon.lng}
              label={booking.slot.salon.name}
              className="h-56 w-full overflow-hidden rounded-2xl border border-slate-200"
            />
            <p className="mt-2 text-sm text-slate-500">
              Kom aan binnen het tijdvenster. Te laat? Slot kan vrijgegeven worden.
            </p>
          </div>

          <Card>
            <CardContent className="p-5 text-sm text-slate-600 space-y-2">
              <p className="font-semibold text-slate-900 flex items-center gap-2">
                <Info className="h-4 w-4 text-[#b4492b]" /> Annuleringsregels
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Annuleren kan tot {booking.slot.salon.cancellationHours} uur voor de start.</li>
                <li>No-show: geen terugbetaling — het gat was voor jou gereserveerd.</li>
                <li>Bevestiging gestuurd naar {booking.customerEmail}</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/slots">Meer last-minute afspraken</Link>
            </Button>
            <Button asChild variant="outline">
              <a href={`/api/bookings/${booking.id}/ics${sp.t ? `?t=${sp.t}` : ""}`}>Zet in agenda</a>
            </Button>
            <Button asChild variant="outline">
              <a
                href={`https://www.openstreetmap.org/?mlat=${booking.slot.salon.lat}&mlon=${booking.slot.salon.lng}#map=16/${booking.slot.salon.lat}/${booking.slot.salon.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                Open in kaart
              </a>
            </Button>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-3 text-sm text-slate-600">
            <p>Je boeking is verwerkt.</p>
            <Button asChild>
              <Link href="/slots">Meer slots</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
