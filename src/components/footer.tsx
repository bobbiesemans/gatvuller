import Link from "next/link";
import { CITIES } from "@/lib/catalog";
import { COMPANY } from "@/lib/config";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-stone-200 bg-white pb-24 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-stone-600 md:grid-cols-3">
        <div>
          <p className="font-bold text-stone-950">GatVuller</p>
          <p className="mt-2 max-w-sm">
            Lokale zaken zetten een leeg uur om in omzet. Klanten boeken dat uur meteen, eerst in Antwerpen.
          </p>
          <p className="mt-3 text-xs text-stone-400">© 2026 {COMPANY.legalName}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/slots" className="hover:text-stone-950">Open uren</Link>
          <Link href="/stad/antwerpen" className="hover:text-stone-950">Antwerpen</Link>
          <Link href="/boekingen" className="hover:text-stone-950">Mijn boekingen</Link>
          <Link href="/favorieten" className="hover:text-stone-950">Favorieten</Link>
          <Link href="/uitnodigen" className="hover:text-stone-950">Uitnodigen</Link>
          <Link href="/register" className="hover:text-stone-950">Voor zaken</Link>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/voorwaarden" className="hover:text-stone-950">Voorwaarden</Link>
          <Link href="/privacy" className="hover:text-stone-950">Privacy</Link>
          <Link href="/contact" className="hover:text-stone-950">Contact</Link>
          <a href={`mailto:${COMPANY.email}`} className="hover:text-stone-950">{COMPANY.email}</a>
          <div className="mt-2 flex flex-wrap gap-2">
            {CITIES.slice(0, 4).map((city) => (
              <Link key={city.slug} href={`/stad/${city.slug}`} className="rounded-full border border-stone-200 px-2 py-0.5 text-xs">
                {city.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
