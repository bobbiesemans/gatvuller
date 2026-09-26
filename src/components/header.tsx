import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function Header() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5 font-extrabold text-xl tracking-tight">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-sm shadow-md shadow-violet-600/30">
            GV
          </span>
          <span>
            Gat<span className="text-violet-600">Vuller</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          <Link href="/slots" className="hover:text-violet-700 transition">
            Surprise slots
          </Link>
          <Link href="/#hoe" className="hover:text-violet-700 transition">
            Hoe het werkt
          </Link>
          {(session?.user?.role === "SALON_OWNER" || session?.user?.role === "ADMIN") && (
            <Link href="/dashboard" className="hover:text-violet-700 transition">
              Salon dashboard
            </Link>
          )}
          {session?.user?.role === "ADMIN" && (
            <Link href="/admin" className="hover:text-violet-700 transition">
              Earnings
            </Link>
          )}
          {!session?.user && (
            <Link href="/register" className="hover:text-violet-700 transition">
              Voor salons
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              <span className="hidden text-sm text-slate-500 sm:inline max-w-[140px] truncate">
                {session.user.name}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="outline" size="sm">
                  Uitloggen
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Inloggen</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Gratis starten</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
