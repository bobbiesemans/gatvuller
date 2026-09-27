"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page]", error.digest || "error");
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-extrabold text-stone-950">Er ging iets mis</h1>
      <p className="mt-2 text-sm text-stone-600">De pagina kon niet geladen worden. Probeer opnieuw.</p>
      <Button type="button" className="mt-6" onClick={reset}>Opnieuw proberen</Button>
    </div>
  );
}
