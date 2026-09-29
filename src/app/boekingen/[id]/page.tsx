import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("ui.voucher");
  return { title: t("metaTitle"), robots: { index: false, follow: false }, alternates: { canonical: `/boekingen/${id}` } };
}

/** Voucher link from e-mails. Access is checked on the voucher page (owner, admin or signed token). */
export default async function VoucherPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const { t } = await searchParams;
  redirect(`/boeking/succes?bookingId=${encodeURIComponent(id)}${t ? `&t=${encodeURIComponent(t)}` : ""}`);
}
