import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-slate-500 sm:flex-row sm:justify-between">
        <div>
          <p className="font-bold text-slate-800">
            Gat<span className="text-violet-600">Vuller</span>
          </p>
          <p className="mt-1 max-w-sm">
            Last-minute afspraken vullen. Salons verdienen, klanten besparen. BE &amp; NL.
          </p>
        </div>
        <div className="flex gap-6">
          <Link href="/slots" className="hover:text-violet-700">
            Slots
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
