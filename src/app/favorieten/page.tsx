import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FavoriteSalonCard } from "./favorite-salon-card";

export const dynamic = "force-dynamic";

export default async function FavorietenPage() {
  const t = await getTranslations("ui.favorites");
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl text-ink">{t("title")}</h1>
        <EmptyState
          className="mt-8"
          title={t("login")}
          action={<Button asChild><Link href="/login?callbackUrl=/favorieten">{t("login")}</Link></Button>}
        />
      </div>
    );
  }

  const favorites = await prisma.favoriteSalon.findMany({
    where: { userId: session.user.id, salon: { status: "ACTIVE" } },
    include: { salon: true },
    orderBy: { createdAt: "desc" },
  });
  const alerts = await prisma.slotAlert.findMany({
    where: { userId: session.user.id, active: true, confirmedAt: { not: null }, salonId: { not: null } },
    select: { salonId: true },
  });
  const alerted = new Set(alerts.map((alert) => alert.salonId));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl text-ink">{t("title")}</h1>
      <p className="mt-2 max-w-xl text-stone-600">{t("lead")}</p>
      {favorites.length === 0 ? (
        <EmptyState className="mt-8" title={t("empty")} action={<Button asChild><Link href="/slots">{t("saved")}</Link></Button>} />
      ) : (
        <ul className="mt-8 space-y-3">
          {favorites.map((favorite) => (
            <FavoriteSalonCard
              key={favorite.salonId}
              salon={{ id: favorite.salon.id, name: favorite.salon.name, city: favorite.salon.city, slug: favorite.salon.slug }}
              alertOn={alerted.has(favorite.salonId)}
              email={session.user.email || ""}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
