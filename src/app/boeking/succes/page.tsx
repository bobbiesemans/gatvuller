import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-emerald-700">Boeking bevestigd ✓</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          {sp.demo === "1" && (
            <p className="rounded-xl bg-amber-50 p-3 text-amber-800">
              Demo-modus: Stripe keys ontbreken, betaling is gesimuleerd als PAID.
            </p>
          )}
          {booking ? (
            <>
              <p>
                <strong>{booking.slot.title}</strong> bij {booking.slot.salon.name}
              </p>
              <p>
                Betaald: {formatEuro(booking.amount)} (waarvan GatVuller fee{" "}
                {formatEuro(booking.feeAmount)})
              </p>
              <p>Bevestiging gaat naar {booking.customerEmail}</p>
            </>
          ) : (
            <p>Je boeking is verwerkt.</p>
          )}
          <Button asChild className="mt-2">
            <Link href="/slots">Meer slots</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
