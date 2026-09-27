"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeCallbackPath } from "@/lib/safe-path";
import { isDemoMode } from "@/lib/config";

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = safeCallbackPath(sp.get("callbackUrl"));
  const demo = isDemoMode();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Onjuiste e-mail of wachtwoord");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Inloggen bij GatVuller</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Wachtwoord</Label>
            <Input id="password" name="password" type="password" required className="mt-1" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Bezig…" : "Inloggen"}
          </Button>
          <p className="text-right text-sm">
            <Link href="/wachtwoord-vergeten" className="text-violet-700">
              Wachtwoord vergeten
            </Link>
          </p>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Nog geen account?{" "}
          <Link href="/register" className="font-semibold text-violet-700">Registreren</Link>
        </p>
        {demo && (
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-950">
            Testmodus. Demo-accounts: salon@, klant@ en admin@gatvuller.be — wachtwoord demo1234. Die accounts werken niet in productie.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-6xl justify-center px-4 py-16">
      <Suspense><LoginForm /></Suspense>
    </div>
  );
}
