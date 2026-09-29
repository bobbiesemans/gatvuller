import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

/** Voucher link from e-mails. Access is checked on the voucher page (owner, admin or signed token). */
export default async function VoucherPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const { t } = await searchParams;
  redirect(`/boeking/succes?bookingId=${encodeURIComponent(id)}${t ? `&t=${encodeURIComponent(t)}` : ""}`);
}
