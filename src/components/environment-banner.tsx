import { environmentMode } from "@/lib/marketplace";

/** Test environments say so on every page; production shows nothing. */
export function EnvironmentBanner() {
  const mode = environmentMode();
  if (mode === "live") return null;
  const text = {
    demo: "Testomgeving: demozaken en gesimuleerde betalingen. Er wordt niets aangerekend.",
    stripe_test: "Stripe-testmodus: betaal met testkaart 4242 4242 4242 4242. Er wordt geen echt geld aangerekend.",
    unconfigured: "Betalingen zijn nog niet ingesteld. Reserveren is tijdelijk niet mogelijk.",
  }[mode];
  return (
    <div role="status" className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-950">
      {text}
    </div>
  );
}
