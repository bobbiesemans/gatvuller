import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Boeking geannuleerd" };

export default async function AnnulerenPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card>
        <CardContent className="p-8 space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">Checkout geannuleerd</p>
          <h1 className="text-2xl font-extrabold text-slate-900">Geen zorgen — er is niets afgeschreven</h1>
          <p className="text-slate-500 text-sm">
            Je last-minute afspraak is nog beschikbaar zolang iemand anders het niet boekt.
            {sp.bookingId ? ` (ref ${sp.bookingId.slice(0, 8)}…)` : ""}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild>
              <Link href="/slots">Terug naar slots</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
