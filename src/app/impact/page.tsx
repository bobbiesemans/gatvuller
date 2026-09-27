import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Impact" };

export default async function ImpactPage() {
  const now = new Date();
  const [salons, openSlots, paidBookings] = await Promise.all([
    prisma.salon.count().catch(() => 0),
    prisma.slot.count({ where: { status: "OPEN", spotsLeft: { gt: 0 }, startsAt: { gte: now } } }).catch(() => 0),
    prisma.booking
      .findMany({ where: { status: "PAID" }, select: { amount: true, slot: { select: { originalPrice: true } } } })
      .catch(() => []),
  ]);
  const filled = paidBookings.length;
  const saved = Math.round(
    paidBookings.reduce((sum, b) => sum + Math.max(0, b.slot.originalPrice - b.amount), 0) / 100
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">Impact</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Minder lege stoelen. Meer besparingen.</h1>
      <p className="mt-3 text-slate-500 max-w-2xl">
        Elk Surprise slot dat gevuld wordt, is omzet voor de salon en korting voor de klant — zonder voedselverspilling.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { k: `${salons}+`, v: "salons aangesloten" },
          { k: `${filled}+`, v: "slots gevuld" },
          { k: `€${saved.toLocaleString("nl-BE")}+`, v: "bespaard door klanten" },
        ].map((s) => (
          <div key={s.v} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-3xl font-extrabold text-violet-700">{s.k}</p>
            <p className="mt-1 text-sm text-slate-500">{s.v}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-slate-400">Live open nu: {openSlots} Surprise slots · demo-data aangevuld met seed.</p>
      <Button asChild className="mt-8">
        <Link href="/slots">Bekijk open slots</Link>
      </Button>
    </div>
  );
}
