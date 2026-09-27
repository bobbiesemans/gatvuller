import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { nlBE } from "date-fns/locale";
import { CreateSlotForm } from "./create-slot-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Salon dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");
  if (session.user.role !== "SALON_OWNER" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  const salons = await prisma.salon.findMany({
    where: session.user.role === "ADMIN" ? {} : { ownerId: session.user.id },
    include: {
      slots: {
        include: {
          bookings: { where: { status: { in: ["PAID", "PENDING", "NO_SHOW"] } }, orderBy: { createdAt: "desc" } },
        },
        orderBy: { startsAt: "desc" },
        take: 40,
      },
    },
  });

  const allBookings = salons.flatMap((s) =>
    s.slots.flatMap((sl) => sl.bookings.filter((b) => b.status === "PAID"))
  );
  const revenue = allBookings.reduce((a, b) => a + b.amount, 0);
  const openSlots = salons.reduce((a, s) => a + s.slots.filter((x) => x.status === "OPEN").length, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">Salon dashboard</h1>
        <p className="text-slate-500">Post Surprise slots in 30s · originele + kortingsprijs · tijdvenster</p>
        <p className="mt-2">
          <a href="/dashboard/boekingen" className="text-sm font-semibold text-violet-700">
            Boekingen afvinken
          </a>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Open slots</p>
            <p className="text-3xl font-extrabold text-violet-700">{openSlots}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Betaalde boekingen</p>
            <p className="text-3xl font-extrabold">{allBookings.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Omzet (bruto)</p>
            <p className="text-3xl font-extrabold">{formatEuro(revenue)}</p>
          </CardContent>
        </Card>
      </div>

      {salons.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-slate-500">
            Nog geen salon. Registreer als salon-eigenaar of gebruik demo account salon@gatvuller.be.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Nieuw Surprise slot</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateSlotForm salons={salons.map((s) => ({ id: s.id, name: s.name }))} />
            </CardContent>
          </Card>

          {salons.map((salon) => (
            <Card key={salon.id}>
              <CardHeader>
                <CardTitle>
                  {salon.name}{" "}
                  <span className="text-sm font-normal text-slate-400">
                    · {salon.city}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {salon.slots.length === 0 && (
                  <p className="text-sm text-slate-500">Nog geen slots.</p>
                )}
                {salon.slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-semibold">{slot.title}</p>
                      <p className="text-slate-500">
                        {format(slot.startsAt, "EEE d MMM HH:mm", { locale: nlBE })} ·{" "}
                        {formatEuro(slot.discountPrice)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          slot.status === "OPEN"
                            ? "success"
                            : slot.status === "BOOKED"
                              ? "violet"
                              : "default"
                        }
                      >
                        {slot.status}
                      </Badge>
                      {slot.bookings.filter((b) => b.status === "PAID").length > 0 && (
                        <span className="text-xs text-slate-500">
                          {slot.bookings
                            .filter((b) => b.status === "PAID")
                            .map((b) => b.customerName)
                            .join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
