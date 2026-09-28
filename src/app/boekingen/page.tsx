import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { nlBE } from "date-fns/locale";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatEuro, shortCode, discountPercent } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookingQr } from "@/components/booking-qr";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { ReviewForm } from "@/components/review-form";
import { MapPin, Clock, Ticket } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn boekingen" };

const STATUS_NL: Record<string, string> = {
  PAID: "Betaald",
  PENDING: "Wacht op betaling",
  CANCELLED: "Geannuleerd",
  REFUNDED: "Terugbetaald",
  EXPIRED: "Verlopen",
  NO_SHOW: "Niet opgedaagd",
};

export default async function BoekingenPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/boekingen");

  const bookings = await prisma.booking.findMany({
    where: { customerId: session.user.id },
    include: { slot: { include: { salon: true } }, review: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div>
        <Badge variant="violet" className="mb-2">
          <Ticket className="h-3.5 w-3.5 mr-1" /> Orders
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight">Mijn boekingen</h1>
        <p className="text-slate-500 mt-1">
          Je-slot bevestigingen — QR, tijdvenster & annuleren (tot 2u voor start).
        </p>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <p className="text-lg font-bold text-slate-900">Nog geen boekingen</p>
            <p className="text-sm text-slate-500">
              Reserveer een last-minute afspraak op de kaart. Je ziet meteen de prijs, de afstand en de annuleringstermijn.
            </p>
            <Button asChild>
              <Link href="/slots">Bekijk last-minute afspraken</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const code = shortCode(b.confirmationCode);
            const open = b.status === "PAID" || b.status === "PENDING";
            const canCancel =
              open && b.slot.startsAt.getTime() - Date.now() > b.slot.salon.cancellationHours * 60 * 60 * 1000;
            return (
              <Card key={b.id} className="overflow-hidden">
                <div
                  className={`px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-white ${
                    b.status === "PAID"
                      ? "bg-[#b4492b]"
                      : b.status === "CANCELLED"
                        ? "bg-slate-500"
                        : "bg-amber-500"
                  }`}
                >
                  <div>
                    <p className="text-xs opacity-90">Bevestiging</p>
                    <p className="text-xl font-extrabold tracking-[0.15em]">{code}</p>
                  </div>
                  <Badge className="bg-white/20 text-white border-0">{STATUS_NL[b.status] ?? b.status}</Badge>
                </div>
                <CardContent className="p-5 flex flex-col sm:flex-row gap-5">
                  {(b.status === "PAID" || b.status === "PENDING") && (
                    <BookingQr value={`GATVULLER:${b.confirmationCode}`} size={120} />
                  )}
                  <div className="flex-1 space-y-2 text-sm text-slate-600">
                    <p className="text-lg font-bold text-slate-900">{b.slot.title}</p>
                    <p>
                      {b.slot.salon.name} · ★ {b.slot.salon.ratingCount > 0 ? b.slot.salon.ratingAvg.toFixed(1) : "Nieuw"}
                    </p>
                    <p className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-[#b4492b] shrink-0" />
                      {b.slot.salon.address}
                    </p>
                    <p className="flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5 text-[#b4492b] shrink-0" />
                      {format(b.slot.startsAt, "EEEE d MMMM · HH:mm", { locale: nlBE })} –{" "}
                      {format(b.slot.endsAt, "HH:mm", { locale: nlBE })}
                    </p>
                    <p className="pt-1">
                      <span className="text-xl font-extrabold text-[#b4492b]">
                        {formatEuro(b.amount)}
                      </span>{" "}
                      <span className="text-xs text-slate-400">
                        -{discountPercent(b.slot.originalPrice, b.slot.discountPrice)}%
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/boekingen/${b.id}`}>Bon bekijken</Link>
                      </Button>
                      {canCancel && <CancelBookingButton bookingId={b.id} />}
                      {b.status === "PAID" && b.slot.endsAt < new Date() && !b.review && (
                        <ReviewForm bookingId={b.id} />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
