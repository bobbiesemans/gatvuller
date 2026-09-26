import { MapPinned, Ticket, Footprints } from "lucide-react";

const STEPS = [
  {
    icon: MapPinned,
    n: "01",
    title: "Ontdek Surprise slots",
    desc: "Open de kaart of lijst. Zie last-minute gaten bij kapper, schoonheid, fysio, tandarts en meer — met korting tot 50%.",
  },
  {
    icon: Ticket,
    n: "02",
    title: "Reserveer & betaal",
    desc: "Kies je tijdvenster, betaal veilig (of demo zonder Stripe) en ontvang meteen je bevestigingscode.",
  },
  {
    icon: Footprints,
    n: "03",
    title: "Ga erheen",
    desc: "Toon je code bij aankomst. Adres + kaartpin staan klaar. Het gat is gevuld — jij hebt bespaard.",
  },
];

export function HowItWorks({ dark = false }: { dark?: boolean }) {
  return (
    <section id="hoe" className={dark ? "bg-slate-950 text-white" : "bg-white"}>
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="max-w-2xl">
          <p className={`text-sm font-semibold uppercase tracking-wider ${dark ? "text-violet-300" : "text-violet-600"}`}>
            Hoe het werkt
          </p>
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight">
            Drie stappen. Zoals Too Good To Go — voor afspraken.
          </h2>
          <p className={`mt-3 ${dark ? "text-slate-400" : "text-slate-600"}`}>
            Geen voedselverspilling, wel lege stoelen. Salons vullen gaten; jij boekt last-minute met korting.
          </p>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className={`rounded-3xl p-6 border ${
                dark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50/80"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/30">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className={`text-sm font-bold ${dark ? "text-violet-300" : "text-violet-600"}`}>{s.n}</span>
              </div>
              <h3 className="mt-5 text-xl font-bold">{s.title}</h3>
              <p className={`mt-2 text-sm leading-relaxed ${dark ? "text-slate-400" : "text-slate-600"}`}>{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
