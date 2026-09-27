const ITEMS = [
  {
    quote:
      "Om 17u een gat in mijn agenda — om 17:20 geboekt via GatVuller. Beter dan een lege stoel.",
    name: "Lotte",
    role: "Salonhaar · Antwerpen",
  },
  {
    quote:
      "Als TGTG voor kappers. Ik check de kaart onderweg naar huis en scoor soms 40% korting.",
    name: "Amir",
    role: "Klant · Brussel",
  },
  {
    quote:
      "Fysio last-minute slots vullen nu wél. De Surprise-prijs voelt fair voor beide kanten.",
    name: "Sofie",
    role: "Fysio · Gent",
  },
  {
    quote:
      "Autodienst met een leeg slot om 11u — Surprise gepost, 12 minuten later vol. Zonder Google Ads.",
    name: "Mark",
    role: "Garage · Amsterdam",
  },
];

export function Testimonials() {
  return (
    <section className="border-y border-slate-200 bg-slate-50/80">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">Social proof</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
          Wat salons & klanten zeggen
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((t) => (
            <figure
              key={t.name}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <blockquote className="text-slate-700 leading-relaxed">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-5">
                <p className="font-bold text-slate-900">{t.name}</p>
                <p className="text-sm text-slate-500">{t.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
