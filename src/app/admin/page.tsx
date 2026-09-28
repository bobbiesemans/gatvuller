import { formatInZone } from "@/lib/time";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SalonReview } from "./salon-review";
import { ReportActions, ReviewVisibility } from "./moderation";
import { funnel } from "@/lib/analytics";
import { environmentMode } from "@/lib/marketplace";
import { isDemoMode } from "@/lib/config";
import { stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin earnings" };

export default async function AdminPage() {
  const me = await getCurrentUser();
  const session = me ? { user: me } : null;
  if (!session?.user) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/");

  const bookings = await prisma.booking.findMany({
    where: { status: "PAID" },
    include: { slot: { include: { salon: true } }, customer: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const gmv = bookings.reduce((a, b) => a + b.amount, 0);
  const fees = bookings.reduce((a, b) => a + b.feeAmount, 0);
  const salons = await prisma.salon.count();
  const openSlots = await prisma.slot.count({ where: { status: "OPEN" } });
  const review = await prisma.salon.findMany({
    where: { status: { in: ["PENDING", "SUSPENDED"] } },
    include: { owner: { select: { email: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  const active = await prisma.salon.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, take: 100 });
  const events = await funnel(new Date(Date.now() - 30 * 86_400_000));
  const count = (name: string) => events.find((e) => e.name === name)?.count ?? 0;
  const steps = ["offer_viewed", "booking_started", "payment_started", "payment_completed", "salon_registered", "first_slot_published"];
  const reports = await prisma.report.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "asc" }, take: 40, include: { salon: { select: { name: true } } } });
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { salon: { select: { name: true } } } });
  const outbox = isDemoMode()
    ? await prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: { id: true, to: true, subject: true, template: true, status: true, createdAt: true } })
    : [];
  const config = [
    ["Stripe", stripeConfigured()],
    ["Stripe-webhook", Boolean(process.env.STRIPE_WEBHOOK_SECRET)],
    ["Connect-webhook", Boolean(process.env.STRIPE_CONNECT_WEBHOOK_SECRET)],
    ["Resend", Boolean(process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes("REPLACE"))],
    ["Cron", Boolean(process.env.CRON_SECRET)],
    ["Foto-opslag", Boolean(process.env.BLOB_READ_WRITE_TOKEN)],
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">GatVuller earnings</h1>
        <p className="text-slate-500">Platform fee overview (admin)</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">GMV</p><p className="text-2xl font-extrabold">{formatEuro(gmv)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Fees</p><p className="text-2xl font-extrabold text-[#b4492b]">{formatEuro(fees)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Salons</p><p className="text-2xl font-extrabold">{salons}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Open slots</p><p className="text-2xl font-extrabold">{openSlots}</p></CardContent></Card>
      </div>
      <p className="text-sm text-slate-500">Omgeving: {environmentMode()}</p>
      <Card>
        <CardHeader><CardTitle>Zaken ter controle ({review.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {review.length === 0 && <p className="text-sm text-slate-500">Niets te controleren.</p>}
          {review.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
              <div>
                <p className="font-semibold">{s.name} · {s.city} · {s.status === "PENDING" ? "wacht op controle" : `geschorst: ${s.suspendedReason ?? ""}`}</p>
                <p className="text-slate-500">{s.address} · KBO {s.businessNumber || "—"} · {s.owner.name} ({s.owner.email}) · pin {s.locationExact ? "exact" : "geschat"}</p>
              </div>
              <SalonReview salonId={s.id} status={s.status} />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Funnel, laatste 30 dagen</CardTitle></CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm sm:grid-cols-3">
            {steps.map((name) => <li key={name} className="rounded-xl border px-3 py-2"><span className="text-slate-500">{name}</span> <strong className="float-right">{count(name)}</strong></li>)}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Actieve zaken</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {active.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
              <span>{s.name} · {s.city}{s.isDemo ? " · demo" : ""}{s.stripeChargesEnabled ? " · Stripe actief" : ""}</span>
              <SalonReview salonId={s.id} status={s.status} />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Configuratie</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-stone-500">Alleen of een onderdeel is ingesteld. Geen sleutels of waarden.</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {config.map(([name, ok]) => (
              <li key={name} className="flex items-center justify-between rounded-xl border px-3 py-2">
                <span>{name}</span>
                <strong>{ok ? "Ingesteld" : "Niet ingesteld"}</strong>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Meldingen ({reports.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {reports.length === 0 && <p className="text-sm text-stone-500">Geen open meldingen.</p>}
          {reports.map((report) => (
            <div key={report.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
              <div>
                <p className="font-semibold">{report.reason} · {report.salon?.name || "zaak"}</p>
                {report.message && <p className="text-stone-500">{report.message}</p>}
              </div>
              <ReportActions id={report.id} />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Beoordelingen</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {reviews.length === 0 && <p className="text-sm text-stone-500">Nog geen beoordelingen.</p>}
          {reviews.map((review) => (
            <div key={review.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
              <span>{review.salon.name} · {"★".repeat(review.rating)}{review.hidden ? " · verborgen" : ""}</span>
              <ReviewVisibility id={review.id} hidden={review.hidden} />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>E-mail-outbox</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!isDemoMode() && <p className="text-stone-500">De outbox is alleen zichtbaar in testmodus.</p>}
          {isDemoMode() && outbox.length === 0 && <p className="text-stone-500">Nog geen berichten.</p>}
          {outbox.map((mail) => (
            <p key={mail.id} className="border-b py-2 last:border-0">
              {mail.status} · {mail.template} · {mail.subject}
            </p>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recente betalingen</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {bookings.length === 0 && <p className="text-sm text-slate-500">Nog geen betalingen.</p>}
          {bookings.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
              <div>
                <p className="font-semibold">{b.slot.title} · {b.slot.salon.name}</p>
                <p className="text-slate-500">{b.customerName} · {formatInZone(b.createdAt, "nl", "dayTime")}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatEuro(b.amount)}</p>
                <p className="text-xs text-[#b4492b]">fee {formatEuro(b.feeAmount)}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
