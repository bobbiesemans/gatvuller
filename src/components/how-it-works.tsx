import { MapPinned, Ticket, Footprints } from "lucide-react";

const STEPS = [
  {
    icon: MapPinned,
    n: "01",
    title: "Kies een vrij uur",
    desc: "Filter op vandaag of morgen, afstand en categorie. Je ziet de zaak, het adres en de echte korting.",
  },
  {
    icon: Ticket,
    n: "02",
    title: "Betaal de getoonde prijs",
    desc: "De plek blijft kort gereserveerd. De boeking is pas betaald als de betaling bevestigd is.",
  },
  {
    icon: Footprints,
    n: "03",
    title: "Toon je code",
    desc: "Je krijgt een bevestiging met QR-code. De zaak ziet dezelfde code in het dashboard.",
  },
];

export function HowItWorks({ dark = false }: { dark?: boolean }) {
  return (
    <section id="hoe" className={dark ? "bg-slate-950 text-white" : "bg-white"}>
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="max-w-2xl">
          <p className={`text-sm font-semibold uppercase tracking-wider ${dark ? "text-violet-300" : "text-[#b4492b]"}`}>
            Hoe het werkt
          </p>
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight">
            Van leeg uur naar afspraak.
          </h2>
          <p className={`mt-3 ${dark ? "text-slate-400" : "text-slate-600"}`}>
            GatVuller is geen algemene agenda. Het is de plek waar een lokale zaak een last-minute uur verkoopt.
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
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#b4492b] text-white shadow-lg shadow-[#b4492b]/30">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className={`text-sm font-bold ${dark ? "text-violet-300" : "text-[#b4492b]"}`}>{s.n}</span>
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
