import Link from "next/link";
import { format } from "date-fns";
import { nlBE } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { formatEuro, shortCode, discountPercent } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingQr } from "@/components/booking-qr";
import { MiniMap } from "@/components/map/mini-map";
import { MapPin, Clock, Info } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Boeking bevestigd" };

export default async function SuccesPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string; demo?: string }>;
}) {
  const sp = await searchParams;
  const booking = sp.bookingId
    ? await prisma.booking.findUnique({
        where: { id: sp.bookingId },
        include: { slot: { include: { salon: true } } },
      })
    : null;

  const code = booking ? shortCode(booking.confirmationCode) : null;
  const qrValue = booking
    ? `GATVULLER:${booking.confirmationCode}`
    : "GATVULLER:DEMO";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-center mb-8">
        <Badge variant="success" className="mb-3">
          Bevestigd
        </Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Je Surprise slot is geboekt ✓
        </h1>
        <p className="mt-2 text-slate-500">
          Toon deze code bij aankomst — net zoals een TGTG-order.
        </p>
      </div>

      {sp.demo === "1" && (
        <p className="mb-6 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-900">
          Demo-modus: Stripe keys ontbreken — betaling is gesimuleerd als PAID.
        </p>
      )}

      {booking ? (
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-5 text-white">
              <p className="text-sm text-violet-100">Bevestigingscode</p>
              <p className="mt-1 text-3xl font-extrabold tracking-[0.2em]">{code}</p>
              <p className="mt-1 text-xs text-violet-200/90">Volledig: {booking.confirmationCode}</p>
            </div>
            <CardContent className="p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              <BookingQr value={qrValue} />
              <div className="space-y-2 text-sm text-slate-600 flex-1">
                <p className="text-lg font-bold text-slate-900">{booking.slot.title}</p>
                <p>
                  {booking.slot.salon.name} · ★ {booking.slot.salon.rating.toFixed(1)}
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-violet-600 shrink-0" />
                  {booking.slot.salon.address}
                </p>
                <p className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 text-violet-600 shrink-0" />
                  {format(booking.slot.startsAt, "EEEE d MMMM · HH:mm", { locale: nlBE })} –{" "}
                  {format(booking.slot.endsAt, "HH:mm", { locale: nlBE })}
                </p>
                <div className="pt-2 flex items-end gap-3">
                  <div>
                    <p className="text-2xl font-extrabold text-violet-700">
                      {formatEuro(booking.amount)}
                    </p>
                    <p className="text-xs text-slate-400">
                      -{discountPercent(booking.slot.originalPrice, booking.slot.discountPrice)}% t.o.v.{" "}
                      {formatEuro(booking.slot.originalPrice)}
                    </p>
                  </div>
                  <Badge variant="violet">Fee {formatEuro(booking.feeAmount)}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="font-bold text-slate-900 mb-2">Locatie &amp; aankomstvenster</h2>
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
                <Info className="h-4 w-4 text-violet-600" /> Annuleringsregels
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Gratis annuleren tot 2 uur voor start (demo).</li>
                <li>No-show: geen terugbetaling — het gat was voor jou gereserveerd.</li>
                <li>Bevestiging gestuurd naar {booking.customerEmail}</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/slots">Meer Surprise slots</Link>
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
