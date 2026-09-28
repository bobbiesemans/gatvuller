import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { nlBE } from "date-fns/locale";
import { SalonReview } from "./salon-review";
import { funnel } from "@/lib/analytics";
import { environmentMode } from "@/lib/marketplace";

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
  const review = await prisma.salon.findMany({
    where: { status: { in: ["PENDING", "SUSPENDED"] } },
    include: { owner: { select: { email: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  const active = await prisma.salon.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, take: 100 });
  const events = await funnel(new Date(Date.now() - 30 * 86_400_000));
  const count = (name: string) => events.find((e) => e.name === name)?.count ?? 0;
  const steps = ["offer_viewed", "booking_started", "payment_started", "payment_completed", "salon_registered", "first_slot_published"];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">GatVuller earnings</h1>
        <p className="text-slate-500">Platform fee overview (admin)</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">GMV</p><p className="text-2xl font-extrabold">{formatEuro(gmv)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Fees</p><p className="text-2xl font-extrabold text-[#b4492b]">{formatEuro(fees)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Salons</p><p className="text-2xl font-extrabold">{salons}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Open slots</p><p className="text-2xl font-extrabold">{openSlots}</p></CardContent></Card>
      </div>
      <p className="text-sm text-slate-500">Omgeving: {environmentMode()}</p>
      <Card>
        <CardHeader><CardTitle>Zaken ter controle ({review.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {review.length === 0 && <p className="text-sm text-slate-500">Niets te controleren.</p>}
          {review.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
              <div>
                <p className="font-semibold">{s.name} · {s.city} · {s.status === "PENDING" ? "wacht op controle" : `geschorst: ${s.suspendedReason ?? ""}`}</p>
                <p className="text-slate-500">{s.address} · KBO {s.businessNumber || "—"} · {s.owner.name} ({s.owner.email}) · pin {s.locationExact ? "exact" : "geschat"}</p>
              </div>
              <SalonReview salonId={s.id} status={s.status} />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Funnel, laatste 30 dagen</CardTitle></CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm sm:grid-cols-3">
            {steps.map((name) => <li key={name} className="rounded-xl border px-3 py-2"><span className="text-slate-500">{name}</span> <strong className="float-right">{count(name)}</strong></li>)}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Actieve zaken</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {active.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
              <span>{s.name} · {s.city}{s.isDemo ? " · demo" : ""}{s.stripeChargesEnabled ? " · Stripe actief" : ""}</span>
              <SalonReview salonId={s.id} status={s.status} />
            </div>
          ))}
        </CardContent>
      </Card>
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
                <p className="text-xs text-[#b4492b]">fee {formatEuro(b.feeAmount)}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
