import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/utils";
import { isDemoMode, PLATFORM_FEE_PERCENT } from "@/lib/config";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { formatInZone, toBrusselsLocalInput } from "@/lib/time";
import { slotVisibility } from "@/lib/marketplace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeskTabs } from "@/components/desk-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateSlotForm } from "./create-slot-form";
import { HoursForm } from "./hours-form";
import { CancellationForm, PayoutButton, TemplateForm } from "./salon-tools";
import { SlotActions } from "./slot-actions";
import { SlotEdit } from "./slot-edit";
import { LocationForm, PhotoForm, ProfileForm, TemplateEdit } from "./manage-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zaakbeheer" };

const PARTS = ["vandaag", "publiceren", "aanbod", "zaak"] as const;
type Part = (typeof PARTS)[number];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ deel?: string }> }) {
  const requested = (await searchParams).deel;
  const part: Part = PARTS.includes(requested as Part) ? (requested as Part) : "vandaag";
  const t = await getTranslations("ui.desk");
  const me = await getCurrentUser();
  const session = me ? { user: me } : null;
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");
  if (session.user.role !== "SALON_OWNER" && session.user.role !== "ADMIN") redirect("/");

  const salons = await prisma.salon.findMany({
    where: session.user.role === "ADMIN" ? {} : { ownerId: session.user.id },
    include: {
      hours: true,
      photos: { orderBy: { sortOrder: "asc" }, take: 8 },
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

  const kpiRows = salons.length === 0 ? [] : await prisma.booking.findMany({
    where: { status: "PAID", slot: { salonId: { in: salons.map((salon) => salon.id) } } },
    select: { amount: true, feeAmount: true, paymentMode: true, slot: { select: { startsAt: true, endsAt: true } } },
  });
  const summarize = (rows: typeof kpiRows) => ({
    revenue: rows.reduce((sum, row) => sum + row.amount, 0),
    net: rows.reduce((sum, row) => sum + Math.max(0, row.amount - row.feeAmount), 0),
    hours: rows.reduce((sum, row) => sum + Math.max(0, (row.slot.endsAt.getTime() - row.slot.startsAt.getTime()) / 3_600_000), 0),
  });
  const liveKpi = summarize(kpiRows.filter((row) => row.paymentMode === "LIVE"));
  const testKpi = summarize(kpiRows.filter((row) => row.paymentMode !== "LIVE"));
  const upcoming = salons.flatMap((s) => s.slots.filter((slot) => slot.startsAt > new Date() && slot.status !== "CANCELLED"));
  const capacitySpots = upcoming.reduce((sum, slot) => sum + slot.capacity, 0);
  const takenSpots = upcoming.reduce((sum, slot) => sum + Math.max(0, slot.capacity - slot.spotsLeft), 0);
  const occupancy = capacitySpots === 0 ? 0 : Math.round((takenSpots / capacitySpots) * 100);
  const guests = salons.length === 0 ? [] : await prisma.booking.findMany({
    where: {
      status: { in: ["PAID", "PENDING"] },
      slot: { endsAt: { gt: new Date() }, salonId: { in: salons.map((salon) => salon.id) } },
    },
    include: { slot: { include: { salon: { select: { name: true } } } } },
    orderBy: { slot: { startsAt: "asc" } },
    take: 24,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink">Zaakbeheer</h1>
          <p className="mt-1 text-stone-600">Eerst wie er komt. Daarna een uur online, of een uur weg.</p>
        </div>
        <Link href="/dashboard/boekingen" className="text-sm font-semibold text-ink underline underline-offset-4">
          {t("checkin")}
        </Link>
      </div>
      <DeskTabs
        base="/dashboard"
        current={part}
        tabs={[
          { id: "vandaag", label: t("today") },
          { id: "publiceren", label: t("publish") },
          { id: "aanbod", label: t("offers") },
          { id: "zaak", label: t("business") },
        ]}
      />

      {isDemoMode() && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Testmodus. Betalingen zijn gesimuleerd en de cijfers hieronder kunnen demoboekingen bevatten.
        </p>
      )}

      {(["LIVE", "TEST"] as const).map((mode) => {
        const kpi = mode === "LIVE" ? liveKpi : testKpi;
        return (
          <section key={mode} className="space-y-3">
            <h2 className="text-lg text-ink">{mode === "LIVE" ? "Live betalingen" : "Test en demo"}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Extra omzet", formatEuro(kpi.revenue)],
                ["Netto na commissie", formatEuro(kpi.net)],
                ["Geredde uren", `${kpi.hours.toFixed(1)} u`],
                ["Bezetting", `${occupancy}%`],
              ].map(([label, value]) => (
                <Card key={`${mode}-${label}`}>
                  <CardContent className="p-5">
                    <p className="text-sm text-stone-500">{label}</p>
                    <p className="mt-1 font-display text-2xl text-ink">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
      <p className="text-sm text-stone-500">
        Platformkosten zijn {PLATFORM_FEE_PERCENT}% van de last-minute prijs, inclusief de Stripe-kosten die GatVuller draagt. De klant betaalt geen extra fee.
      </p>

      {salons.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-stone-600">
            Nog geen zaak gekoppeld. <Link href="/register" className="font-semibold underline">Registreer je zaak</Link>.
          </CardContent>
        </Card>
      ) : part === "publiceren" ? (
        <Card>
          <CardHeader>
            <CardTitle>Vrij uur publiceren</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-stone-600">{t("publishLead")}</p>
            <CreateSlotForm
              salons={salons.map((s) => ({ id: s.id, name: s.name }))}
              templates={salons.flatMap((s) => s.templates)}
            />
          </CardContent>
        </Card>
      ) : part === "vandaag" ? (
        guests.length === 0 ? (
          <EmptyState title={t("noGuests")} action={<Link href="/dashboard?deel=publiceren" className="text-sm font-semibold underline">{t("publish")}</Link>} />
        ) : (
          <ul className="space-y-3">
            {guests.map((booking) => (
              <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e7dfd6] bg-white px-4 py-4">
                <div>
                  <p className="font-display text-lg text-ink">{booking.customerName}</p>
                  <p className="text-sm text-stone-600">{booking.slot.title} · {booking.slot.salon.name}</p>
                  <p className="text-sm text-stone-500">{formatInZone(booking.slot.startsAt, "nl", "dayTime")}</p>
                </div>
                <Link href={`/dashboard/boekingen?code=${booking.confirmationCode}`} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">
                  {t("checkin")}
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : part === "aanbod" ? (
        <div className="space-y-6">
          <p className="text-sm text-stone-600">{t("offersLead")}</p>
          {salons.map((salon) => (
            <Card key={salon.id}>
              <CardHeader><CardTitle>{salon.name}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {salon.slots.length === 0 && <p className="text-sm text-stone-500">Nog geen uren gepubliceerd.</p>}
                {salon.slots.map((slot) => {
                  const visibility = slotVisibility(slot, salon);
                  return (
                    <div key={slot.id} className="border-b border-stone-100 py-3 text-sm last:border-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">{slot.title}</p>
                          <p className="text-stone-500">
                            {formatInZone(slot.startsAt, "nl", "dayTime")} · {formatEuro(slot.discountPrice)} · {slot.spotsLeft}/{slot.capacity} vrij
                          </p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-brand">{t(`visibility.${visibility}`)}</p>
                        </div>
                        <SlotActions slotId={slot.id} status={slot.status} />
                      </div>
                      {slot.status !== "CANCELLED" && slot.status !== "EXPIRED" && (
                        <SlotEdit
                          slot={{
                            id: slot.id,
                            title: slot.title,
                            description: slot.description,
                            startsLocal: toBrusselsLocalInput(slot.startsAt),
                            endsLocal: toBrusselsLocalInput(slot.endsAt),
                            originalPrice: slot.originalPrice,
                            discountPrice: slot.discountPrice,
                            capacity: slot.capacity,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <p className="text-sm text-stone-600">{t("businessLead")}</p>
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
                <CardHeader><CardTitle>Zaakprofiel</CardTitle></CardHeader>
                <CardContent>
                  <ProfileForm salon={salon} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Foto’s</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {salon.photos.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {salon.photos.map((photo) => (
                        <li key={photo.id}>
                          <div role="img" aria-label={photo.alt || salon.name} className="h-16 w-16 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${photo.url})` }} />
                        </li>
                      ))}
                    </ul>
                  )}
                  <PhotoForm salonId={salon.id} enabled={Boolean(process.env.BLOB_READ_WRITE_TOKEN)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Extra locatie</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-stone-600">Een tweede adres wordt een aparte zaak en wacht op goedkeuring.</p>
                  <LocationForm />
                </CardContent>
              </Card>

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
                    {salon.templates.map((template) => (
                      <li key={template.id} className="border-b border-stone-100 py-2 last:border-0">
                        <p>{template.title} · {template.durationMin} min · {formatEuro(template.discountPrice)}</p>
                        <TemplateEdit template={template} />
                      </li>
                    ))}
                  </ul>
                  <TemplateForm salonId={salon.id} />
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
