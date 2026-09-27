import { isDemoMode, PLATFORM_FEE_PERCENT } from "@/lib/config";

export function TrustBar() {
  const demo = isDemoMode();
  return (
    <div className="border-y border-stone-200 bg-white">
      <ul className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-4 py-3 text-xs font-medium text-stone-500">
        <li>{demo ? "Testmodus — betalingen zijn gesimuleerd" : "Betaling via Stripe"}</li>
        <li>Platformkosten {PLATFORM_FEE_PERCENT}% voor de zaak</li>
        <li>Beoordelingen pas na een bezoek</li>
        <li>OpenStreetMap</li>
      </ul>
    </div>
  );
}
