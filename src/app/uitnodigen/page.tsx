import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomCode } from "@/lib/codes";
import { appUrl } from "@/lib/config";
import { CopyCodeButton } from "@/components/copy-code-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nodig iemand uit", robots: { index: false } };

export default async function InvitePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/uitnodigen");
  let user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { referralCode: true } });
  if (!user) redirect("/login");
  if (!user.referralCode) {
    user = await prisma.user.update({
      where: { id: session.user.id },
      data: { referralCode: randomCode(8) },
      select: { referralCode: true },
    });
  }
  const link = `${appUrl()}/register?ref=${user.referralCode}`;

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-stone-950">Nodig een zaak of klant uit</h1>
      <p className="mt-2 text-sm text-stone-600">
        Deel je link. We onthouden alleen dat het nieuwe account via jouw code binnenkwam. Er is nog geen geldpremie aan verbonden.
      </p>
      <p className="mt-6 break-all rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm">{link}</p>
      <div className="mt-3">
        <CopyCodeButton code={link} />
      </div>
    </div>
  );
}
