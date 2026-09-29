import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { verifyBookingToken } from "@/lib/tokens";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Betaling afgebroken", robots: { index: false, follow: false } };

/** Where the customer lands after pressing "back" on the Stripe page. The spot was released by the status page. */
export default async function AnnulerenPage({ searchParams }: { searchParams: Promise<{ b?: string; t?: string }> }) {
  const { b, t: token } = await searchParams;
  if (!b || !verifyBookingToken(b, token)) redirect("/slots");
  const booking = await prisma.booking.findUnique({ where: { id: b }, select: { slotId: true, status: true } });
  if (!booking) redirect("/slots");
  if (booking.status === "PAID") redirect(`/boeking/succes?bookingId=${b}&t=${encodeURIComponent(token || "")}`);
  const t = await getTranslations("ui.cancelled");

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card>
        <CardContent className="space-y-4 p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">{t("kicker")}</p>
          <h1 className="text-3xl text-ink">{t("title")}</h1>
          <p className="text-sm text-stone-600">{t("body")}</p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild>
              <Link href={`/slots/${booking.slotId}`}>{t("retry")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/slots">{t("browse")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
