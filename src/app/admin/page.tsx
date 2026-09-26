import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { nlBE } from "date-fns/locale";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin earnings" };

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/");

  const bookings = await prisma.booking.findMany({
    where: { status: "PAID" },
    include: { slot: { include: { salon: true } }, customer: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const gmv = bookings.reduce((a, b) => a + b.amount, 0);
  const fees = bookings.reduce((a, b) => a + b.feeAmount, 0);
  const salons = await prisma.salon.count();
  const openSlots = await prisma.slot.count({ where: { status: "OPEN" } });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">GatVuller earnings</h1>
        <p className="text-slate-500">Platform fee overview (admin)</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">GMV</p><p className="text-2xl font-extrabold">{formatEuro(gmv)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Fees</p><p className="text-2xl font-extrabold text-violet-700">{formatEuro(fees)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Salons</p><p className="text-2xl font-extrabold">{salons}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Open slots</p><p className="text-2xl font-extrabold">{openSlots}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Recente betalingen</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {bookings.length === 0 && <p className="text-sm text-slate-500">Nog geen betalingen.</p>}
          {bookings.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
              <div>
                <p className="font-semibold">{b.slot.title} · {b.slot.salon.name}</p>
                <p className="text-slate-500">{b.customerName} · {format(b.createdAt, "d MMM HH:mm", { locale: nlBE })}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatEuro(b.amount)}</p>
                <p className="text-xs text-violet-700">fee {formatEuro(b.feeAmount)}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
