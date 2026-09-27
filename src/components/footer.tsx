import Link from "next/link";
import { CITIES } from "@/lib/utils";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50 pb-20 md:pb-0">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 text-sm text-slate-500 sm:flex-row sm:justify-between">
        <div>
          <p className="font-bold text-slate-800 text-base">
            Gat<span className="text-violet-600">Vuller</span>
          </p>
          <p className="mt-1 max-w-md">
            Too Good To Go voor afspraken — niet voor eten. Surprise slots bij kapper, schoonheid,
            fysio, tandarts & meer in België & Nederland.
          </p>
          <p className="mt-3 text-xs text-slate-400">© 2026 GatVuller · Privacy & voorwaarden (demo)</p>
        </div>
        <div className="flex flex-col gap-4 sm:items-end">
          <div className="flex flex-wrap gap-4 sm:justify-end">
            <Link href="/slots" className="hover:text-violet-700">
              Surprise slots
            </Link>
            <Link href="/favorieten" className="hover:text-violet-700">
              Favorieten
            </Link>
            <Link href="/#hoe" className="hover:text-violet-700">
              Hoe het werkt
            </Link>
            <Link href="/register" className="hover:text-violet-700">
              Voor salons
            </Link>
            <Link href="/login" className="hover:text-violet-700">
              Login
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {CITIES.map((c) => (
              <Link
                key={c}
                href={`/slots?stad=${c}`}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 hover:border-violet-300 hover:text-violet-800"
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
