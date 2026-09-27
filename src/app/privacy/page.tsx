import type { Metadata } from "next";
import { COMPANY } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Welke gegevens GatVuller verwerkt en hoe je ze laat verwijderen.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 space-y-4 text-sm leading-relaxed text-stone-700">
      <h1 className="text-3xl font-extrabold tracking-tight text-stone-950">Privacy</h1>
      <p>
        Verwerkingsverantwoordelijke: {COMPANY.legalName}, {COMPANY.address}. Contact: {COMPANY.privacyEmail}.
        {COMPANY.vatNumber ? ` BTW ${COMPANY.vatNumber}.` : ""}
      </p>
      <h2 className="text-lg font-bold text-stone-950">Welke gegevens</h2>
      <p>
        Account: naam, e-mail, wachtwoordhash, rol. Boeking: naam, e-mail, optioneel telefoon, het uur en het betaalde bedrag. Zaak: naam, adres, coördinaten, openingstijden en Stripe-account-id. We slaan geen kaartnummers op.
      </p>
      <h2 className="text-lg font-bold text-stone-950">Waarom</h2>
      <p>
        Om een uur te reserveren, fraude en dubbele boekingen te voorkomen, de zaak te laten weten wie komt, en uit te betalen. Analytics bewaart alleen een gebeurtenisnaam (bijvoorbeeld “aanbod bekeken”), geen naam of e-mail.
      </p>
      <h2 className="text-lg font-bold text-stone-950">Bewaartermijn en rechten</h2>
      <p>
        Boekingen blijven zolang ze nodig zijn voor betaling, betwisting en boekhouding. Je kan inzage, verbetering of verwijdering vragen via {COMPANY.privacyEmail}. Verwijderen anonimiseert het account: de boeking blijft bestaan zonder herleidbare naam, omdat de betaling dat vereist. Je kan ook een klacht indienen bij de Gegevensbeschermingsautoriteit.
      </p>
      <h2 className="text-lg font-bold text-stone-950">Verwerkers</h2>
      <p>Hosting op Vercel, database PostgreSQL, betalingen via Stripe, e-mail via Resend wanneer die is ingesteld, kaarten via OpenStreetMap.</p>
    </article>
  );
}
