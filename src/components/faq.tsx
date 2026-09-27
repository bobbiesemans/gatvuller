const QA = [
  {
    q: "Is GatVuller hetzelfde als Too Good To Go?",
    a: "De mentaliteit is hetzelfde — surplus last-minute — maar wij doen afspraken (kapper, fysio, tandarts…), geen voedsel.",
  },
  {
    q: "Wat is een Surprise slot?",
    a: "Een gat in de agenda van een salon dat goedkoper wordt aangeboden. Tijdvenster, prijs en adres ken je voor je boekt.",
  },
  {
    q: "Moet ik Stripe hebben om te demo'en?",
    a: "Nee. Zonder Stripe keys boekt de demo meteen als PAID met QR-code en bevestiging.",
  },
  {
    q: "Wat kost het voor salons?",
    a: "Geen abonnement. 18% fee per geslaagde boeking. Posten van slots is gratis.",
  },
  {
    q: "Kan ik annuleren?",
    a: "In de demo: gratis annuleren tot 2 uur voor start. Daarna volgt het salonbeleid.",
  },
  {
    q: "Werkt de kaart zonder Google Maps key?",
    a: "Ja. We gebruiken Leaflet + OpenStreetMap — gratis, geen API-key nodig.",
  },
];

export function Faq() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">FAQ</p>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Veelgestelde vragen</h2>
      <div className="mt-8 divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white">
        {QA.map((item) => (
          <details key={item.q} className="group px-6 py-4">
            <summary className="cursor-pointer list-none font-semibold text-slate-900 flex items-center justify-between gap-4">
              {item.q}
              <span className="text-violet-600 group-open:rotate-45 transition text-xl leading-none">+</span>
            </summary>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
