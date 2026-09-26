import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-slate-500 sm:flex-row sm:justify-between">
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
        <div className="flex flex-wrap gap-6">
          <Link href="/slots" className="hover:text-violet-700">
            Surprise slots
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
      </div>
    </footer>
  );
}
