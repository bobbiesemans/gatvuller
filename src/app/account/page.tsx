import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccount, PasswordForm, ProfileForm, SignOutButton } from "./account-forms";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.account");
  return { title: t("metaTitle"), description: t("metaDesc"), alternates: { canonical: "/account" }, robots: { index: false } };
}

export default async function AccountPage() {
  const t = await getTranslations("ui.account");
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/account");
  const extra = await prisma.user.findUnique({ where: { id: user.id }, select: { marketingOptIn: true } });

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl text-ink">{t("title")}</h1>
          <p className="mt-1 break-all text-sm text-stone-600">{t("signedInAs", { email: user.email })}</p>
        </div>
        <SignOutButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("profileTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm name={user.name} phone={user.phone ?? ""} locale={user.locale} marketingOptIn={extra?.marketingOptIn ?? false} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("passwordTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm email={user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dataTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-stone-700">
          <p>{t("exportLead")}</p>
          <a
            href="/api/account"
            download
            className="inline-flex min-h-11 items-center rounded-xl border border-stone-300 bg-white px-4 font-semibold text-ink hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {t("exportButton")}
          </a>
          <p className="text-xs text-stone-600">{t("exportNote", { email: COMPANY.privacyEmail })}</p>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle>{t("erasureTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-stone-700">
          <p>{t("erasureLead")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-stone-50 p-3">
              <p className="font-semibold text-ink">{t("erasureGoesTitle")}</p>
              <p className="mt-1">{t("erasureGoes")}</p>
            </div>
            <div className="rounded-xl bg-stone-50 p-3">
              <p className="font-semibold text-ink">{t("erasureStaysTitle")}</p>
              <p className="mt-1">{t("erasureStays")}</p>
            </div>
          </div>
          <p>{t("erasureBlockers")}</p>
          <DeleteAccount />
        </CardContent>
      </Card>
    </div>
  );
}
