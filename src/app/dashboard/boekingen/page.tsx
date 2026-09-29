import { formatInZone } from "@/lib/time";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckInForm } from "./check-in-form";
import { BookingActions } from "./booking-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Salonboekingen" };

export default async function SalonBoekingenPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const me = await getCurrentUser();
  const session = me ? { user: me } : null;
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent(`/dashboard/boekingen${code ? `?code=${code.replace(/[^A-Za-z0-9]/g, "")}` : ""}`)}`);
  if (session.user.role !== "SALON_OWNER" && session.user.role !== "ADMIN") redirect("/");

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ["PAID", "PENDING", "NO_SHOW", "CANCELLED", "REFUNDED"] },
      ...(session.user.role === "ADMIN" ? {} : { slot: { salon: { ownerId: session.user.id } } }),
    },
    include: { slot: { include: { salon: true } } },
    orderBy: { slot: { startsAt: "asc" } },
    take: 80,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Boekingen</h1>
          <p className="text-slate-500 mt-1">Vink een klant af met de code op de bon.</p>
        </div>
        <Link href="/dashboard" className="text-sm font-semibold text-[#b4492b]">
          Terug naar dashboard
        </Link>
      </div>
      <CheckInForm initialCode={(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16)} />
      {bookings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-slate-500">Nog geen boekingen.</CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <li key={b.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">{b.slot.title}</p>
                  <p className="text-sm text-slate-500">
                    {b.slot.salon.name} · {formatInZone(b.slot.startsAt, "nl", "dayTime")}
                  </p>
                  <p className="mt-1 text-sm">
                    {b.customerName} · <span className="font-mono tracking-wider">{b.confirmationCode}</span>
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={b.status === "PAID" ? "success" : "default"}>{b.status}</Badge>
                  <p className="mt-1 text-sm font-semibold">{formatEuro(b.amount)}</p>
                  {b.checkedInAt && <p className="text-xs text-emerald-700">Aanwezig</p>}
                </div>
              </div>
              <BookingActions
                bookingId={b.id}
                canNoShow={b.status === "PAID" && !b.checkedInAt && b.slot.startsAt < new Date()}
                canRefund={b.status === "PAID" && !b.checkedInAt && b.slot.endsAt > new Date()}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
