import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { stripeConfigured, stripeMode } from "@/lib/stripe";
import { payoutOverview, retrieveConnectState, type ConnectState, type PayoutOverview } from "@/lib/payments";
import { formatEuro } from "@/lib/money";
import { formatInZone } from "@/lib/time";
import { log } from "@/lib/log";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayoutButton } from "../salon-tools";

export const dynamic = "force-dynamic";
export const metadata = { title: "Uitbetalingen", robots: { index: false } };

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<{ zaak?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/uitbetalingen");
  if (user.role !== "SALON_OWNER" && user.role !== "ADMIN") redirect("/");
  const { zaak } = await searchParams;
  const salons = await prisma.salon.findMany({ where: user.role === "ADMIN" ? (zaak ? { id: zaak } : { id: "__none__" }) : { ownerId: user.id }, orderBy: { name: "asc" } });
  const configured = stripeConfigured();

  const rows = await Promise.all(
    salons.map(async (salon) => {
      let state: ConnectState | null = null;
      let payouts: PayoutOverview | null = null;
      if (configured && salon.stripeAccountId) {
        try {
          state = await retrieveConnectState(salon.stripeAccountId);
          await prisma.salon.update({ where: { id: salon.id }, data: { stripeChargesEnabled: state.chargesEnabled, stripePayoutsEnabled: state.payoutsEnabled, stripeDetailsSubmitted: state.detailsSubmitted } });
          if (state.payoutsEnabled) payouts = await payoutOverview(salon.stripeAccountId);
        } catch (error) {
          log.warn("payouts.load_failed", { salonId: salon.id, error });
        }
      }
      return { salon, state, payouts };
    })
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link href="/dashboard" className="text-sm underline">← Zaakbeheer</Link>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-950">Uitbetalingen</h1>
        <p className="mt-1 text-stone-600">Klanten betalen via Stripe. Stripe stort het bedrag min de GatVuller-commissie op je rekening; GatVuller bewaart geen kaart- of rekeninggegevens.</p>
      </div>
      {!configured && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">Stripe is in deze omgeving nog niet ingesteld. Uitbetalingen koppelen kan pas wanneer de beheerder Stripe activeert.</p>}
      {configured && stripeMode() === "test" && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">Stripe-testmodus: er wordt geen echt geld uitbetaald.</p>}
      {rows.map(({ salon, state, payouts }) => (
        <Card key={salon.id}>
          <CardHeader><CardTitle>{salon.name}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-stone-700">
            {salon.isDemo ? (
              <p>Demozaak: geen uitbetalingen.</p>
            ) : !salon.stripeAccountId ? (
              <p>Nog geen uitbetalingsaccount. Zonder koppeling kunnen klanten niet bij je boeken.</p>
            ) : state ? (
              <ul className="space-y-1">
                <li>Betalingen ontvangen: <strong>{state.chargesEnabled ? "actief" : "nog niet actief"}</strong></li>
                <li>Uitbetalingen: <strong>{state.payoutsEnabled ? "actief" : "nog niet actief"}</strong></li>
                {state.requirementsDue.length > 0 && <li className="text-amber-800">Stripe vraagt nog {state.requirementsDue.length} gegeven(s). Vul ze aan via de knop.</li>}
              </ul>
            ) : (
              <p>De status kon niet geladen worden. Probeer het later opnieuw.</p>
            )}
            {payouts && (
              <div className="rounded-xl bg-stone-50 p-3">
                <p>Beschikbaar: <strong>{formatEuro(payouts.available)}</strong> · Onderweg: <strong>{formatEuro(payouts.pending)}</strong></p>
                <ul className="mt-2 space-y-1">
                  {payouts.payouts.length === 0 && <li className="text-stone-500">Nog geen uitbetalingen.</li>}
                  {payouts.payouts.map((p) => <li key={p.id}>{formatInZone(p.arrivalDate, "nl", "date")} · {formatEuro(p.amount)} · {p.status}</li>)}
                </ul>
              </div>
            )}
            {!salon.isDemo && <PayoutButton salonId={salon.id} configured={configured} />}
          </CardContent>
        </Card>
      ))}
      {rows.length === 0 && <p className="text-sm text-stone-600">Geen zaak gevonden.</p>}
    </div>
  );
}
