export function TrustBar() {
  return (
    <div className="border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <span>Leaflet · OpenStreetMap</span>
        <span>Demo zonder Stripe</span>
        <span>BE &amp; NL steden</span>
        <span>18% fee · geen abo</span>
        <span>QR-bevestiging</span>
      </div>
    </div>
  );
}
