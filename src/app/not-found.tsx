import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center space-y-4">
      <p className="text-sm font-semibold uppercase tracking-wider text-[#b4492b]">404</p>
      <h1 className="text-3xl font-extrabold text-slate-900">Dit last-minute afspraak bestaat niet</h1>
      <p className="text-slate-500">Misschien al geboekt — of de link is verouderd.</p>
      <Button asChild>
        <Link href="/slots">Bekijk open slots</Link>
      </Button>
    </div>
  );
}
