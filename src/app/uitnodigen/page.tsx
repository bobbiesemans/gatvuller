import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { randomCode } from "@/lib/codes";
import { appUrl } from "@/lib/config";
import { CopyCodeButton } from "@/components/copy-code-button";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.invite");
  return { title: t("metaTitle"), description: t("metaDesc"), alternates: { canonical: "/uitnodigen" }, robots: { index: false } };
}

export default async function InvitePage() {
  const t = await getTranslations("ui.invite");
  const me = await getCurrentUser();
  if (!me) redirect("/login?callbackUrl=/uitnodigen");
  let user = await prisma.user.findUnique({ where: { id: me.id }, select: { referralCode: true } });
  if (!user) redirect("/login");
  if (!user.referralCode) {
    user = await prisma.user.update({
      where: { id: me.id },
      data: { referralCode: randomCode(8) },
      select: { referralCode: true },
    });
  }
  const link = `${appUrl()}/register?ref=${user.referralCode}`;

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl text-ink">{t("title")}</h1>
      <p className="mt-2 text-sm text-stone-700">{t("lead")}</p>
      <p id="invite-link-label" className="mt-6 text-sm font-medium text-stone-700">
        {t("linkLabel")}
      </p>
      <p aria-labelledby="invite-link-label" className="mt-1 break-all rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm">
        {link}
      </p>
      <div className="mt-3">
        <CopyCodeButton code={link} />
      </div>
      <p className="mt-6 text-xs text-stone-600">{t("note")}</p>
    </div>
  );
}
