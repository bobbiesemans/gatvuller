import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function Header() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5 font-extrabold text-xl tracking-tight">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-white text-sm">
            GV
          </span>
          <span>GatVuller</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          <Link href="/slots" className="hover:text-[#b4492b] transition">
            Open uren
          </Link>
          <Link href="/favorieten" className="hover:text-[#b4492b] transition">
            Favorieten
          </Link>
          {session?.user && (
            <Link href="/boekingen" className="hover:text-[#b4492b] transition">
              Mijn boekingen
            </Link>
          )}
          <Link href="/#hoe" className="hover:text-[#b4492b] transition">
            Hoe het werkt
          </Link>
          {(session?.user?.role === "SALON_OWNER" || session?.user?.role === "ADMIN") && (
            <Link href="/dashboard" className="hover:text-[#b4492b] transition">
              Mijn zaak
            </Link>
          )}
          {session?.user?.role === "ADMIN" && (
            <Link href="/admin" className="hover:text-[#b4492b] transition">
              Beheer
            </Link>
          )}
          {!session?.user && (
            <Link href="/register" className="hover:text-[#b4492b] transition">
              Voor salons
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              <Link href="/account" className="hidden max-w-[140px] truncate text-sm text-slate-600 hover:underline sm:inline">
                {session.user.name}
              </Link>
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
                <Link href="/register">Registreren</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
