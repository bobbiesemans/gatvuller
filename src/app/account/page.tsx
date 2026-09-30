import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccount, ProfileForm } from "./account-forms";
import { CustomerLinks } from "@/components/customer-links";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account", robots: { index: false } };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/account");
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-950">Account</h1>
        <p className="mt-1 text-sm text-stone-600">{user.email}</p>
      </div>
      <CustomerLinks current="account" />
      <Card>
        <CardHeader><CardTitle>Gegevens</CardTitle></CardHeader>
        <CardContent><ProfileForm name={user.name} phone={user.phone ?? ""} locale={user.locale} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Privacy</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm text-stone-700">
          <p>Download alles wat GatVuller over je bewaart, in een leesbaar bestand.</p>
          <a href="/api/account" className="inline-flex h-10 items-center rounded-xl border border-stone-300 px-4 font-semibold">
            Mijn gegevens downloaden
          </a>
          <p>
            Bij verwijderen wissen we je naam, e-mail, telefoon, favorieten en meldingen. Bedragen en data van boekingen blijven
            anoniem bewaard voor de boekhouding.
          </p>
          <DeleteAccount />
        </CardContent>
      </Card>
    </div>
  );
}
