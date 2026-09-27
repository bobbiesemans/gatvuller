import type { Metadata } from "next";
import { COMPANY, PLATFORM_FEE_PERCENT } from "@/lib/config";

export const metadata: Metadata = {
  title: "Gebruiksvoorwaarden",
  description: "Voorwaarden voor klanten en zaken op GatVuller.",
  alternates: { canonical: "/voorwaarden" },
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 prose-stone space-y-4 text-sm leading-relaxed text-stone-700">
      <h1 className="text-3xl font-extrabold tracking-tight text-stone-950">Gebruiksvoorwaarden</h1>
      <p>
        GatVuller ({COMPANY.legalName}, {COMPANY.address}) is een marktplaats. Lokale dienstverleners publiceren een vrij uur met een eigen prijs. Klanten reserveren dat uur en betalen online. GatVuller is geen partij bij de behandeling zelf.
      </p>
      <h2 className="text-lg font-bold text-stone-950">Aanbod</h2>
      <p>
        Een zaak mag alleen een uur publiceren dat echt vrij is, tegen een normale prijs en een lagere last-minute prijs. Verzonnen schaarste of een prijs die niet de eigen tarieflijst volgt, mag verwijderd worden. GatVuller kan een zaak opschorten bij misbruik.
      </p>
      <h2 className="text-lg font-bold text-stone-950">Betaling</h2>
      <p>
        De klant betaalt de last-minute prijs. Daar komt geen extra platformtoeslag bij. De zaak betaalt {PLATFORM_FEE_PERCENT}% platformkosten, berekend op de server. Kaartgegevens worden verwerkt door Stripe en niet opgeslagen door GatVuller. Een boeking is pas betaald als Stripe dat bevestigt. In testmodus is betaling gesimuleerd en staat dat expliciet op het scherm.
      </p>
      <h2 className="text-lg font-bold text-stone-950">Annuleren en no-show</h2>
      <p>
        Een klant kan annuleren tot het aantal uur dat de zaak instelt (standaard 2) vóór de start. Dan volgt een terugbetaling via Stripe, of in testmodus een administratieve terugbetaling. Na die termijn en bij no-show blijft het bedrag betaald: het uur was gereserveerd. De zaak kan een boeking annuleren; dan krijgt de klant het bedrag terug.
      </p>
      <h2 className="text-lg font-bold text-stone-950">Beoordelingen</h2>
      <p>Een beoordeling kan alleen na een uitgevoerde, betaalde boeking. Verborgen of beledigende teksten kunnen worden verwijderd.</p>
      <h2 className="text-lg font-bold text-stone-950">Uitbetaling</h2>
      <p>Zaken ontvangen hun deel via Stripe Connect. GatVuller houdt geen kaarttegoeden aan. Zolang Connect niet is afgerond, is er geen productie-uitbetaling.</p>
      <p>Vragen: <a className="underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p>
    </article>
  );
}
