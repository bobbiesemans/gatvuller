import { PLATFORM_FEE_PERCENT } from "@/lib/config";

const QA = [
  {
    q: "Wat is GatVuller?",
    a: "Een marktplaats waarop kappers, salons en masseurs een leeg uur met korting publiceren. Jij boekt dat uur, niet een willekeurige afspraak in een agenda.",
  },
  {
    q: "Zijn de kortingen echt?",
    a: "De zaak vult zelf de normale prijs en de last-minute prijs in. GatVuller verzint geen percentage en geen aantal resterende plekken.",
  },
  {
    q: "Wanneer is een boeking betaald?",
    a: "Pas als Stripe de betaling bevestigt. Terugkeren naar de site is niet genoeg. Zonder Stripe-sleutels draait het platform in testmodus en staat dat op de bevestiging.",
  },
  {
    q: "Wat kost het een zaak?",
    a: `Geen abonnement. ${PLATFORM_FEE_PERCENT}% van de last-minute prijs, berekend op de server. De klant betaalt geen extra toeslag.`,
  },
  {
    q: "Kan ik annuleren?",
    a: "Tot de termijn die de zaak instelt, standaard 2 uur voor de start. Daarna en bij no-show volgt geen terugbetaling.",
  },
  {
    q: "Hoe werkt de kaart?",
    a: "Met Leaflet en OpenStreetMap. Er is geen aparte kaartsleutel nodig.",
  },
];

export function Faq() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-3xl font-extrabold tracking-tight text-stone-950">Vragen</h2>
      <div className="mt-8 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {QA.map((item) => (
          <details key={item.q} className="group px-6 py-4">
            <summary className="cursor-pointer list-none font-semibold text-stone-900">{item.q}</summary>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
