import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AnnuleerPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Betaling geannuleerd</h1>
      <p className="mt-2 text-slate-500">Geen zorgen — er is niets afgeschreven. Probeer opnieuw.</p>
      <Button asChild className="mt-6">
        <Link href="/slots">Terug naar slots</Link>
      </Button>
    </div>
  );
}
