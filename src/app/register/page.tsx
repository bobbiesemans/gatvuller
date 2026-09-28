"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/lib/utils";
import { CITIES } from "@/lib/catalog";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="px-4 py-16 text-center text-sm text-stone-500">Laden…</div>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<"CUSTOMER" | "SALON_OWNER">("CUSTOMER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"), email: fd.get("email"), password: fd.get("password"), role,
      salonName: fd.get("salonName") || undefined, city: fd.get("city") || undefined,
      category: fd.get("category") || undefined, address: fd.get("address") || undefined,
      referralCode: params.get("ref") || undefined,
      terms: true,
    };
    const res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Registratie mislukt"); setLoading(false); return; }

    await signIn("credentials", { email: payload.email as string, password: payload.password as string, redirect: false });
    router.push(role === "SALON_OWNER" ? "/dashboard" : "/slots");
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-6xl justify-center px-4 py-16">
      <Card className="w-full max-w-lg">
        <CardHeader><CardTitle>Account aanmaken — GatVuller</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Button type="button" variant={role === "CUSTOMER" ? "default" : "outline"} size="sm" onClick={() => setRole("CUSTOMER")}>Ik ben klant</Button>
            <Button type="button" variant={role === "SALON_OWNER" ? "default" : "outline"} size="sm" onClick={() => setRole("SALON_OWNER")}>Ik ben een salon</Button>
          </div>
          <form onSubmit={onSubmit} className="space-y-3">
            <div><Label htmlFor="name">Naam</Label><Input id="name" name="name" required className="mt-1" /></div>
            <div><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required className="mt-1" /></div>
            <div><Label htmlFor="password">Wachtwoord (minstens 8 tekens)</Label><Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required className="mt-1" /></div>
            {role === "SALON_OWNER" && (
              <>
                <div><Label htmlFor="salonName">Salonnaam</Label><Input id="salonName" name="salonName" required className="mt-1" /></div>
                <div>
                  <Label htmlFor="city">Stad</Label>
                  <select id="city" name="city" required className="mt-1 flex h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">
                    {CITIES.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="category">Categorie</Label>
                  <select id="category" name="category" required className="mt-1 flex h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><Label htmlFor="address">Adres</Label><Input id="address" name="address" required className="mt-1" /></div>
              </>
            )}
            <label className="flex items-start gap-2 text-sm text-stone-600">
              <input type="checkbox" name="terms" required className="mt-1" />
              <span>Ik ga akkoord met de <Link href="/voorwaarden" className="underline">voorwaarden</Link> en het <Link href="/privacy" className="underline">privacybeleid</Link>.</span>
            </label>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Bezig…" : "Account aanmaken"}</Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">Al een account? <Link href="/login" className="font-semibold text-violet-700">Inloggen</Link></p>
        </CardContent>
      </Card>
    </div>
  );
}
