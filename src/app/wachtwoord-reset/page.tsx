"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ResetForm() {
  const token = useSearchParams().get("token") || "";
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const password = String(new FormData(e.currentTarget).get("password") || "");
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("De link is ongeldig of verlopen.");
      return;
    }
    setDone(true);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Nieuw wachtwoord</CardTitle>
      </CardHeader>
      <CardContent>
        {done ? (
          <Button asChild className="w-full">
            <Link href="/login">Inloggen</Link>
          </Button>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Nieuw wachtwoord (min. 8)</Label>
              <Input id="password" name="password" type="password" minLength={8} required className="mt-1" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || token.length < 20}>
              {loading ? "Bezig…" : "Wachtwoord opslaan"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPage() {
  return (
    <div className="mx-auto flex max-w-6xl justify-center px-4 py-16">
      <Suspense>
        <ResetForm />
      </Suspense>
    </div>
  );
}
