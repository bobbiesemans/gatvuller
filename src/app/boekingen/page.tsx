import { formatInZone } from "@/lib/time";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/session";
import { appUrl } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { formatEuro, shortCode, discountPercent } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { BookingQr } from "@/components/booking-qr";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { ReviewForm } from "@/components/review-form";
import { MapPin, Clock } from "lucide-react";
import { toLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";


export default async function BoekingenPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await getCurrentUser();
  const session = me ? { user: me } : null;
  if (!session?.user) redirect("/login?callbackUrl=/boekingen");
  const t = await getTranslations("ui.bookings");
  const tab = (await searchParams).tab === "voorbij" ? "past" : "upcoming";
  const lc = toLocale(await getLocale());

  const bookings = await prisma.booking.findMany({
    where: { customerId: session.user.id },
    include: { slot: { include: { salon: true } }, review: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const now = new Date();
  const upcoming = bookings.filter((b) => b.slot.startsAt > now && (b.status === "PAID" || b.status === "PENDING"));
  const past = bookings.filter((b) => !upcoming.includes(b));
  const shown = tab === "past" ? past : upcoming;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl text-ink">{t("title")}</h1>
        <p className="mt-1 text-stone-500">{t("lead")}</p>
      </div>
      <div className="flex gap-2" role="tablist">
        <Button asChild size="sm" variant={tab === "upcoming" ? "default" : "outline"}>
          <Link href="/boekingen" role="tab" aria-selected={tab === "upcoming"}>{t("upcoming")}</Link>
        </Button>
        <Button asChild size="sm" variant={tab === "past" ? "default" : "outline"}>
          <Link href="/boekingen?tab=voorbij" role="tab" aria-selected={tab === "past"}>{t("past")}</Link>
        </Button>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          body={t("emptyBody")}
          action={<Button asChild><Link href="/slots">{t("cta")}</Link></Button>}
        />
      ) : (
        <div className="space-y-4">
          {shown.map((b) => {
            const code = shortCode(b.confirmationCode);
            const open = b.status === "PAID" || b.status === "PENDING";
            const canCancel = open && b.slot.startsAt.getTime() - Date.now() > b.slot.salon.cancellationHours * 60 * 60 * 1000;
            const known = ["PAID", "PENDING", "CANCELLED", "REFUNDED", "EXPIRED", "NO_SHOW"] as const;
            const label = (known as readonly string[]).includes(b.status) ? t(b.status as (typeof known)[number]) : b.status;
            return (
              <Card key={b.id} className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-brand px-5 py-3 text-white">
                  <div>
                    <p className="text-xs opacity-90">{t("confirmation")}</p>
                    <p className="text-xl font-extrabold tracking-[0.15em]">{code}</p>
                  </div>
                  <StatusPill status={b.status} label={label} />
                </div>
                <CardContent className="flex flex-col gap-5 p-5 sm:flex-row">
                  {open && <BookingQr value={`${appUrl()}/dashboard/boekingen?code=${b.confirmationCode}`} size={120} />}
                  <div className="flex-1 space-y-2 text-sm text-stone-600">
                    <p className="text-lg font-bold text-ink">{b.slot.title}</p>
                    <p>{b.slot.salon.name}</p>
                    <p className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      {b.slot.salon.address}
                    </p>
                    <p className="flex items-start gap-2">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      {formatInZone(b.slot.startsAt, lc, "dayMonth")} · {formatInZone(b.slot.startsAt, lc, "time")} – {formatInZone(b.slot.endsAt, lc, "time")}
                    </p>
                    <p className="pt-1">
                      <span className="text-xl font-extrabold text-brand">{formatEuro(b.amount)}</span>{" "}
                      <span className="text-xs text-stone-400">-{discountPercent(b.slot.originalPrice, b.slot.discountPrice)}%</span>
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/boekingen/${b.id}`}>{t("voucher")}</Link>
                      </Button>
                      {canCancel && <CancelBookingButton bookingId={b.id} />}
                      {b.status === "PAID" && b.slot.endsAt < now && !b.review && <ReviewForm bookingId={b.id} />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
