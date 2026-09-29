import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { LAUNCHED_CATEGORIES, LAUNCH_CITY } from "@/lib/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOwner } from "../access";
import { HoursForm } from "../hours-form";
import { LocationForm, PhotoForm, ProfileForm, TemplateItem } from "../manage-forms";
import { CancellationForm, TemplateForm } from "../salon-tools";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.dashboard");
  return { title: t("settingsTitle"), description: t("meta.settings"), alternates: { canonical: "/dashboard/profiel" }, robots: { index: false } };
}

export default async function ProfilePage() {
  const user = await requireOwner("/dashboard/profiel");
  const t = await getTranslations("ui.dashboard");
  const common = await getTranslations("ui.common");
  const category = await getTranslations("ui.card.category");

  const salons = await prisma.salon.findMany({
    where: user.role === "ADMIN" ? {} : { ownerId: user.id },
    include: {
      hours: true,
      photos: { orderBy: { sortOrder: "asc" }, take: 8 },
      templates: { where: { active: true }, orderBy: { createdAt: "desc" }, take: 30 },
    },
    orderBy: { createdAt: "asc" },
    take: user.role === "ADMIN" ? 20 : undefined,
  });
  const several = salons.length > 1;
  const uploads = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

  return (
    <div className="space-y-8 py-6">
      <div>
        <h1 className="text-3xl text-ink">{t("settingsTitle")}</h1>
        <p className="mt-1 text-stone-600">{t("settingsLead")}</p>
      </div>

      {salons.length === 0 ? (
        <EmptyState
          title={t("none")}
          action={
            <Link href="/register" className="font-semibold text-brand underline underline-offset-4">
              {t("register")}
            </Link>
          }
        />
      ) : (
        <>
          {salons.map((salon) => (
            <section key={salon.id} aria-labelledby={`salon-${salon.id}`} className="space-y-4">
              <div>
                <h2 id={`salon-${salon.id}`} className="text-xl text-ink">
                  {salon.name}
                </h2>
                <p className="text-sm text-stone-600">
                  {salon.city} · {t(`salonStatus.${salon.status}`)} · {salon.verified ? common("verified") : common("unverified")} ·{" "}
                  <Link href={`/salon/${salon.slug}`} className="underline underline-offset-2">
                    {t("publicPage")}
                  </Link>
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t("profile")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProfileForm salon={salon} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("photos")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {salon.photos.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {salon.photos.map((photo) => (
                        <li key={photo.id}>
                          <div role="img" aria-label={photo.alt || salon.name} className="h-20 w-20 rounded-lg bg-stone-100 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(photo.url)})` }} />
                        </li>
                      ))}
                    </ul>
                  )}
                  <PhotoForm salonId={salon.id} enabled={uploads} count={salon.photos.length} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("hoursTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <HoursForm salonId={salon.id} initial={salon.hours} />
                  <hr className="border-stone-200" />
                  <CancellationForm salonId={salon.id} hours={salon.cancellationHours} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("templates")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-stone-600">{t("manage.tplHint")}</p>
                  {salon.templates.length === 0 ? (
                    <p className="text-sm text-stone-600">{t("noTemplates")}</p>
                  ) : (
                    <ul className="divide-y divide-stone-100 text-sm">
                      {salon.templates.map((template) => (
                        <li key={template.id} className="py-3">
                          <TemplateItem template={template} />
                        </li>
                      ))}
                    </ul>
                  )}
                  <TemplateForm salonId={salon.id} />
                </CardContent>
              </Card>
              {several && <hr className="border-stone-200" />}
            </section>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>{t("extra")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-stone-600">{t("extraHint")}</p>
              <LocationForm categories={LAUNCHED_CATEGORIES.map((c) => ({ key: c.key, label: category(c.key) }))} defaultCity={LAUNCH_CITY.name} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
