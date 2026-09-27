import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { nlBE } from "date-fns/locale";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/utils";
import { isDemoMode, PLATFORM_FEE_PERCENT } from "@/lib/config";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateSlotForm } from "./create-slot-form";
import { HoursForm } from "./hours-form";
import { CancellationForm, PayoutButton, TemplateForm } from "./salon-tools";
import { SlotActions } from "./slot-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zaakbeheer" };

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Online",
  PAUSED: "Gepauzeerd",
  BOOKED: "Volzet",
  CANCELLED: "Verwijderd",
  EXPIRED: "Afgelopen",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");
  if (session.user.role !== "SALON_OWNER" && session.user.role !== "ADMIN") redirect("/");

  const salons = await prisma.salon.findMany({
    where: session.user.role === "ADMIN" ? {} : { ownerId: session.user.id },
    include: {
      hours: true,
      templates: { where: { active: true }, orderBy: { createdAt: "desc" } },
      slots: {
        include: {
          bookings: { where: { status: { in: ["PAID", "PENDING", "NO_SHOW"] } }, orderBy: { createdAt: "desc" } },
        },
        orderBy: { startsAt: "desc" },
        take: 30,
      },
    },
    take: session.user.role === "ADMIN" ? 20 : undefined,
  });

  const stripe = stripeConfigured() ? getStripe() : null;
  if (stripe && session.user.role !== "ADMIN") {
    for (const salon of salons) {
      if (!salon.stripeAccountId) continue;
      const account = await stripe.accounts.retrieve(salon.stripeAccountId).catch(() => null);
      if (!account) continue;
      const charges = Boolean(account.charges_enabled);
      const payouts = Boolean(account.payouts_enabled);
      if (charges !== salon.stripeChargesEnabled || payouts !== salon.stripePayoutsEnabled) {
        await prisma.salon.update({
          where: { id: salon.id },
          data: { stripeChargesEnabled: charges, stripePayoutsEnabled: payouts },
        });
        salon.stripeChargesEnabled = charges;
        salon.stripePayoutsEnabled = payouts;
      }
    }
  }

  const paid = salons.flatMap((s) => s.slots.flatMap((slot) => slot.bookings.filter((b) => b.status === "PAID").map((b) => ({ ...b, slot }))));
  const revenue = paid.reduce((sum, b) => sum + b.amount, 0);
  const fees = paid.reduce((sum, b) => sum + b.feeAmount, 0);
  const savedMinutes = paid.reduce((sum, b) => sum + Math.max(0, (b.slot.endsAt.getTime() - b.slot.startsAt.getTime()) / 60000), 0);
  const upcoming = salons.flatMap((s) => s.slots.filter((slot) => slot.startsAt > new Date() && slot.status !== "CANCELLED"));
  const capacitySpots = upcoming.reduce((sum, slot) => sum + slot.capacity, 0);
  const takenSpots = upcoming.reduce((sum, slot) => sum + Math.max(0, slot.capacity - slot.spotsLeft), 0);
  const occupancy = capacitySpots === 0 ? 0 : Math.round((takenSpots / capacitySpots) * 100);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-950">Zaakbeheer</h1>
          <p className="mt-1 text-stone-600">Publiceer een vrij uur, volg reserveringen en zie wat GatVuller oplevert.</p>
        </div>
        <Link href="/dashboard/boekingen" className="text-sm font-semibold text-stone-900 underline underline-offset-4">
          QR-code controleren
        </Link>
      </div>

      {isDemoMode() && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Testmodus. Betalingen zijn gesimuleerd en de cijfers hieronder kunnen demoboekingen bevatten.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Extra omzet", formatEuro(revenue)],
          ["Na platformkosten", formatEuro(Math.max(0, revenue - fees))],
          ["Geredde uren", `${(savedMinutes / 60).toFixed(1)} u`],
          ["Bezetting komende slots", `${occupancy}%`],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-sm text-stone-500">{label}</p>
              <p className="mt-1 text-2xl font-extrabold text-stone-950">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-stone-500">
        Platformkosten zijn {PLATFORM_FEE_PERCENT}% van de last-minute prijs, berekend op de server. De klant betaalt geen extra fee.
      </p>

      {salons.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-stone-600">
            Nog geen zaak gekoppeld. <Link href="/register" className="font-semibold underline">Registreer je zaak</Link>.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Vrij uur publiceren</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateSlotForm
                salons={salons.map((s) => ({ id: s.id, name: s.name }))}
                templates={salons.flatMap((s) => s.templates)}
              />
            </CardContent>
          </Card>

          {salons.map((salon) => (
            <section key={salon.id} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-stone-950">
                  {salon.name}
                  <span className="ml-2 text-sm font-normal text-stone-500">{salon.city}</span>
                </h2>
                <p className="text-sm text-stone-500">
                  {salon.verified ? "Geverifieerd" : "Nog niet geverifieerd"} · publieke pagina{" "}
                  <Link href={`/salon/${salon.slug}`} className="underline">/salon/{salon.slug}</Link>
                </p>
              </div>

              <Card>
                <CardHeader><CardTitle>Uitbetalingen</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm text-stone-700">
                  <p>
                    {salon.stripePayoutsEnabled
                      ? "Stripe Connect is actief. Uitbetalingen lopen via Stripe, niet via GatVuller."
                      : salon.stripeAccountId
                        ? "Stripe-account gekoppeld. Uitbetalingen zijn nog niet geactiveerd."
                        : "Nog geen uitbetalingsaccount. Zonder Stripe blijven boekingen in testmodus."}
                  </p>
                  <PayoutButton salonId={salon.id} configured={stripeConfigured()} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Openingstijden en annulering</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <HoursForm salonId={salon.id} initial={salon.hours} />
                  <CancellationForm salonId={salon.id} hours={salon.cancellationHours} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Behandelsjablonen</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <ul className="text-sm text-stone-700">
                    {salon.templates.length === 0 && <li>Nog geen sjablonen.</li>}
                    {salon.templates.map((t) => (
                      <li key={t.id}>{t.title} · {t.durationMin} min · {formatEuro(t.discountPrice)}</li>
                    ))}
                  </ul>
                  <TemplateForm salonId={salon.id} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Aanbiedingen</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {salon.slots.length === 0 && <p className="text-sm text-stone-500">Nog geen uren gepubliceerd.</p>}
                  {salon.slots.map((slot) => (
                    <div key={slot.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 py-3 text-sm last:border-0">
                      <div>
                        <p className="font-semibold text-stone-900">{slot.title}</p>
                        <p className="text-stone-500">
                          {format(slot.startsAt, "EEE d MMM HH:mm", { locale: nlBE })} · {formatEuro(slot.discountPrice)} · {slot.spotsLeft}/{slot.capacity} vrij · {STATUS_LABEL[slot.status] || slot.status}
                        </p>
                        {slot.bookings.filter((b) => b.status === "PAID").length > 0 && (
                          <p className="text-xs text-stone-500">
                            {slot.bookings.filter((b) => b.status === "PAID").map((b) => b.customerName).join(", ")}
                          </p>
                        )}
                      </div>
                      <SlotActions slotId={slot.id} status={slot.status} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
