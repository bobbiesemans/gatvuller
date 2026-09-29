import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/money";
import { formatInZone } from "@/lib/time";
import { funnel } from "@/lib/analytics";
import { environmentMode } from "@/lib/marketplace";
import { isDemoMode } from "@/lib/config";
import { stripeConfigured } from "@/lib/stripe";
import { normalizeBusinessNumber } from "@/lib/business-number";
import { toLocale } from "@/i18n/config";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { SalonReview } from "./salon-review";
import { ReportActions, ReviewVisibility } from "./moderation";

export const dynamic = "force-dynamic";

const LIMIT = 100;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.admin");
  return { title: t("title"), description: t("lead"), alternates: { canonical: "/admin" }, robots: { index: false, follow: false } };
}

const CUSTOMER_STEPS = ["offer_viewed", "booking_started", "payment_started", "payment_completed"] as const;
const BUSINESS_STEPS = ["salon_registered", "salon_approved", "first_slot_published"] as const;

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4">
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div>
            <h2 id={`${id}-title`} className="text-xl text-ink">
              {title}
            </h2>
            {lead && <p className="mt-1 text-sm text-stone-600">{lead}</p>}
          </div>
          {children}
        </CardContent>
      </Card>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-stone-200 px-3 py-3 text-sm">{children}</div>;
}

export default async function AdminPage() {
  // The role comes from the database (getCurrentUser), never from the token.
  const me = await getCurrentUser();
  if (!me) redirect("/login?callbackUrl=/admin");
  if (me.role !== "ADMIN") redirect("/");

  const t = await getTranslations("ui.admin");
  const tCat = await getTranslations("ui.card.category");
  const tReport = await getTranslations("ui.report");
  const locale = toLocale(await getLocale());
  const now = new Date();
  const day = 86_400_000;

  const dbOk = await prisma.$queryRaw`SELECT 1`.then(
    () => true,
    () => false
  );

  const [byMode, salonGroups, openReal, openDemo, queue, queueTotal, active, activeTotal, events7, events30, reports, reportsTotal, reviews, reviewsTotal, payments, paymentsTotal, failedMails, outbox] =
    await Promise.all([
      prisma.booking.groupBy({ by: ["paymentMode"], where: { status: "PAID" }, _count: { _all: true }, _sum: { amount: true, feeAmount: true } }),
      prisma.salon.groupBy({ by: ["isDemo", "status"], _count: { _all: true } }),
      prisma.slot.count({ where: { status: "OPEN", spotsLeft: { gt: 0 }, startsAt: { gte: now }, salon: { isDemo: false } } }),
      prisma.slot.count({ where: { status: "OPEN", spotsLeft: { gt: 0 }, startsAt: { gte: now }, salon: { isDemo: true } } }),
      prisma.salon.findMany({
        where: { status: { in: ["PENDING", "SUSPENDED"] } },
        include: { owner: { select: { email: true, name: true } } },
        orderBy: { createdAt: "asc" },
        take: LIMIT,
      }),
      prisma.salon.count({ where: { status: { in: ["PENDING", "SUSPENDED"] } } }),
      prisma.salon.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, take: LIMIT }),
      prisma.salon.count({ where: { status: "ACTIVE" } }),
      funnel(new Date(now.getTime() - 7 * day)),
      funnel(new Date(now.getTime() - 30 * day)),
      prisma.report.findMany({
        where: { status: "OPEN" },
        orderBy: { createdAt: "asc" },
        take: LIMIT,
        include: { salon: { select: { name: true } }, slot: { select: { title: true, salon: { select: { name: true } } } } },
      }),
      prisma.report.count({ where: { status: "OPEN" } }),
      prisma.review.findMany({ orderBy: { createdAt: "desc" }, take: LIMIT, include: { salon: { select: { name: true } } } }),
      prisma.review.count(),
      prisma.booking.findMany({
        where: { status: "PAID" },
        include: { slot: { include: { salon: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
      }),
      prisma.booking.count({ where: { status: "PAID" } }),
      prisma.emailLog.count({ where: { status: "FAILED", createdAt: { gte: new Date(now.getTime() - 7 * day) } } }),
      isDemoMode()
        ? prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: { id: true, to: true, subject: true, template: true, status: true, createdAt: true } })
        : Promise.resolve([]),
    ]);

  const mode = (m: "LIVE" | "TEST" | "DEMO") => byMode.find((r) => r.paymentMode === m);
  const salonCount = (demo: boolean, status?: string) =>
    salonGroups.filter((g) => g.isDemo === demo && (!status || g.status === status)).reduce((a, g) => a + g._count._all, 0);
  const count = (rows: { name: string; count: number }[], name: string) => rows.find((e) => e.name === name)?.count ?? 0;
  const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "–");
  const limitNote = (shown: number, total: number) => (total > shown ? <p className="text-xs text-stone-600">{t("limitNote", { shown, total })}</p> : null);

  const envKey = environmentMode();
  const modeText = { demo: t("modeDemo"), stripe_test: t("modeStripeTest"), live: t("modeLive"), unconfigured: t("modeNone") }[envKey];
  const emailOn = Boolean(process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes("REPLACE"));
  const cronOn = Boolean(process.env.CRON_SECRET);
  const health: { label: string; value: string; ok: boolean }[] = [
    { label: t("healthDb"), value: dbOk ? t("dbOk") : t("dbDown"), ok: dbOk },
    { label: t("healthPayments"), value: modeText, ok: envKey === "live" || envKey === "stripe_test" || envKey === "demo" },
    { label: t("healthEmail"), value: emailOn ? t("emailOn") : t("emailOff"), ok: emailOn },
    { label: t("healthCron"), value: cronOn ? t("cronSet") : t("cronUnset"), ok: cronOn },
  ];
  const config = [
    [t("stripe"), stripeConfigured()],
    [t("webhook"), Boolean(process.env.STRIPE_WEBHOOK_SECRET)],
    [t("connectWebhook"), Boolean(process.env.STRIPE_CONNECT_WEBHOOK_SECRET)],
    [t("resend"), emailOn],
    [t("cron"), cronOn],
    [t("blob"), Boolean(process.env.BLOB_READ_WRITE_TOKEN)],
  ] as const;

  const stripeState = (s: { isDemo: boolean; stripeChargesEnabled: boolean; stripeDetailsSubmitted: boolean; stripeAccountId: string | null }) =>
    s.isDemo ? t("stripeDemo") : s.stripeChargesEnabled ? t("stripeActive") : s.stripeDetailsSubmitted ? t("stripeReview") : s.stripeAccountId ? t("stripeStarted") : t("stripeNone");
  const businessNumber = (value: string | null) => {
    if (!value) return t("bnMissing");
    return normalizeBusinessNumber(value) ? t("bnValid", { value }) : t("bnInvalid", { value });
  };

  const nav: [string, string][] = [
    ["queue", t("reviewQueue")],
    ["health", t("healthTitle")],
    ["totals", t("totalsTitle")],
    ["funnel", t("funnelTitle")],
    ["moderation", t("moderationTitle")],
    ["active", t("active")],
    ["payments", t("payments")],
  ];

  const funnelTable = (title: string, steps: readonly string[]) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[20rem] text-left text-sm">
        <caption className="pb-2 text-left font-semibold text-ink">{title}</caption>
        <thead>
          <tr className="border-b border-stone-200 text-xs text-stone-600">
            <th scope="col" className="py-1 pr-2 font-medium">
              {t("funnelStep")}
            </th>
            <th scope="col" className="px-2 py-1 text-right font-medium">
              {t("days7")}
            </th>
            <th scope="col" className="py-1 pl-2 text-right font-medium">
              {t("days30")}
            </th>
          </tr>
        </thead>
        <tbody>
          {steps.map((name, i) => {
            const c7 = count(events7, name);
            const c30 = count(events30, name);
            return (
              <tr key={name} className="border-b border-stone-100 last:border-0">
                <th scope="row" className="py-2 pr-2 font-normal">
                  {t(`step.${name}` as never)}
                </th>
                <td className="px-2 py-2 text-right tabular-nums">
                  <strong>{c7}</strong>
                  {i > 0 && <span className="block text-xs text-stone-600">{pct(c7, count(events7, steps[i - 1]))}</span>}
                </td>
                <td className="py-2 pl-2 text-right tabular-nums">
                  <strong>{c30}</strong>
                  {i > 0 && <span className="block text-xs text-stone-600">{pct(c30, count(events30, steps[i - 1]))}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
  const fewData = count(events30, CUSTOMER_STEPS[0]) < 30 && count(events30, BUSINESS_STEPS[0]) < 5;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl text-ink">{t("title")}</h1>
        <p className="mt-1 text-sm text-stone-600">{t("lead")}</p>
      </div>
      <nav aria-label={t("navLabel")}>
        <ul className="flex flex-wrap gap-2">
          {nav.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="inline-flex min-h-11 items-center rounded-full border border-stone-300 bg-white px-4 text-sm font-medium text-ink hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="queue" title={`${t("reviewQueue")} (${queueTotal})`} lead={t("queueLead")}>
        {queue.length === 0 && <p className="text-sm text-stone-600">{t("nothing")}</p>}
        {queue.map((s) => (
          <Row key={s.id}>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                <span>{s.name}</span>
                <StatusPill status={s.status} label={s.status === "PENDING" ? t("statusPending") : t("statusSuspended")} />
                {s.isDemo && <StatusPill status="DEMO" label={t("demoTag")} />}
              </p>
              {s.status === "SUSPENDED" && s.suspendedReason && <p className="text-red-800">{t("suspendedReason", { reason: s.suspendedReason })}</p>}
              <dl className="grid gap-x-4 gap-y-1 text-stone-700 sm:grid-cols-[auto_1fr]">
                <dt className="text-stone-600">{t("labelAddress")}</dt>
                <dd className="break-words">
                  {s.address}
                  {s.postalCode ? `, ${s.postalCode}` : ""} {s.city} · {s.locationExact ? t("pinExact") : t("pinEstimated")}
                </dd>
                <dt className="text-stone-600">{t("labelCategory")}</dt>
                <dd>{tCat(s.category)}</dd>
                <dt className="text-stone-600">{t("labelBusinessNumber")}</dt>
                <dd>{businessNumber(s.businessNumber)}</dd>
                <dt className="text-stone-600">{t("labelStripe")}</dt>
                <dd>{stripeState(s)}</dd>
                <dt className="text-stone-600">{t("labelRegistered")}</dt>
                <dd>{formatInZone(s.createdAt, locale, "date")}</dd>
                <dt className="text-stone-600">{t("labelOwner")}</dt>
                <dd className="break-all">
                  {s.owner.name} · {s.owner.email}
                </dd>
              </dl>
            </div>
            <SalonReview salonId={s.id} salonName={s.name} status={s.status} />
          </Row>
        ))}
        {limitNote(queue.length, queueTotal)}
      </Section>

      <Section id="health" title={t("healthTitle")} lead={t("healthLead")}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {health.map((h) => (
            <li key={h.label} className="rounded-xl border border-stone-200 px-3 py-2 text-sm">
              <p className="text-xs text-stone-600">{h.label}</p>
              <p className={h.ok ? "font-semibold text-ink" : "font-semibold text-red-800"}>{h.value}</p>
            </li>
          ))}
          <li className="rounded-xl border border-stone-200 px-3 py-2 text-sm">
            <p className="text-xs text-stone-600">{t("cronLast")}</p>
            <p className="font-semibold text-ink">{t("cronUnknown")}</p>
          </li>
          <li className="rounded-xl border border-stone-200 px-3 py-2 text-sm">
            <p className="text-xs text-stone-600">{t("emailFailed")}</p>
            <p className={failedMails > 0 ? "font-semibold text-red-800" : "font-semibold text-ink"}>{failedMails}</p>
          </li>
        </ul>
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer py-2 font-medium text-ink">{t("config")}</summary>
          <p className="text-stone-600">{t("configLead")}</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {config.map(([name, ok]) => (
              <li key={name} className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2">
                <span>{name}</span>
                <strong className={ok ? "text-ink" : "text-red-800"}>{ok ? t("set") : t("missing")}</strong>
              </li>
            ))}
          </ul>
        </details>
      </Section>

      <Section id="totals" title={t("totalsTitle")} lead={t("totalsLead")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs text-stone-600">
                <th scope="col" className="py-1 pr-2 font-medium">
                  {t("env")}
                </th>
                <th scope="col" className="px-2 py-1 text-right font-medium">
                  {t("colBookings")}
                </th>
                <th scope="col" className="px-2 py-1 text-right font-medium">
                  {t("gmv")}
                </th>
                <th scope="col" className="py-1 pl-2 text-right font-medium">
                  {t("fees")}
                </th>
              </tr>
            </thead>
            <tbody>
              {(["LIVE", "TEST", "DEMO"] as const).map((m) => (
                <tr key={m} className="border-b border-stone-100 last:border-0">
                  <th scope="row" className="py-2 pr-2 font-medium">
                    {t(`row.${m}` as never)}
                  </th>
                  <td className="px-2 py-2 text-right tabular-nums">{mode(m)?._count._all ?? 0}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatEuro(mode(m)?._sum.amount ?? 0, locale)}</td>
                  <td className="py-2 pl-2 text-right tabular-nums">{formatEuro(mode(m)?._sum.feeAmount ?? 0, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          <li className="rounded-xl border border-stone-200 px-3 py-2 text-sm">
            <p className="text-xs text-stone-600">{t("salonsReal")}</p>
            <p className="font-semibold text-ink">{t("salonsRealValue", { active: salonCount(false, "ACTIVE"), pending: salonCount(false, "PENDING"), suspended: salonCount(false, "SUSPENDED") })}</p>
          </li>
          <li className="rounded-xl border border-stone-200 px-3 py-2 text-sm">
            <p className="text-xs text-stone-600">{t("salonsDemo")}</p>
            <p className="font-semibold text-ink">{salonCount(true)}</p>
          </li>
          <li className="rounded-xl border border-stone-200 px-3 py-2 text-sm">
            <p className="text-xs text-stone-600">{t("openReal")}</p>
            <p className="font-semibold text-ink">{openReal}</p>
          </li>
          <li className="rounded-xl border border-stone-200 px-3 py-2 text-sm">
            <p className="text-xs text-stone-600">{t("openDemo")}</p>
            <p className="font-semibold text-ink">{openDemo}</p>
          </li>
        </ul>
      </Section>

      <Section id="funnel" title={t("funnelTitle")} lead={t("funnelLead")}>
        <div className="grid gap-6 lg:grid-cols-2">
          {funnelTable(t("funnelCustomers"), CUSTOMER_STEPS)}
          {funnelTable(t("funnelBusinesses"), BUSINESS_STEPS)}
        </div>
        <p className="text-xs text-stone-600">{t("funnelNote")}</p>
        {fewData && <p className="text-xs font-medium text-stone-800">{t("funnelFew")}</p>}
      </Section>

      <Section id="moderation" title={t("moderationTitle")}>
        <h3 className="text-lg text-ink">
          {t("reports")} ({reportsTotal})
        </h3>
        {reports.length === 0 && <p className="text-sm text-stone-600">{t("noReports")}</p>}
        {reports.map((r) => {
          const name = r.salon?.name ?? r.slot?.salon.name ?? "–";
          return (
            <Row key={r.id}>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">
                  {tReport(r.reason)} · {name}
                </p>
                {r.slot && <p className="text-stone-700">{t("reportOffer", { title: r.slot.title })}</p>}
                {r.message && <p className="mt-1 break-words text-stone-700">{r.message}</p>}
                <p className="text-xs text-stone-600">{formatInZone(r.createdAt, locale, "dayTime")}</p>
              </div>
              <ReportActions id={r.id} context={name} />
            </Row>
          );
        })}
        {limitNote(reports.length, reportsTotal)}
        <h3 className="pt-2 text-lg text-ink">{t("reviews")}</h3>
        {reviews.length === 0 && <p className="text-sm text-stone-600">{t("noReviews")}</p>}
        {reviews.map((r) => (
          <Row key={r.id}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">
                {r.salon.name} · {t("ratingOf", { rating: r.rating })}
                {r.hidden && <span className="ml-2 font-normal text-red-800">{t("reviewHidden")}</span>}
              </p>
              <p className="break-words text-stone-700">{r.comment || t("reviewNoComment")}</p>
              <p className="text-xs text-stone-600">
                {formatInZone(r.createdAt, locale, "date")}
                {r.verifiedVisit ? ` · ${t("reviewVerified")}` : ""}
              </p>
            </div>
            <ReviewVisibility id={r.id} hidden={r.hidden} context={r.salon.name} />
          </Row>
        ))}
        {limitNote(reviews.length, reviewsTotal)}
      </Section>

      <Section id="active" title={`${t("active")} (${activeTotal})`}>
        {active.length === 0 && <p className="text-sm text-stone-600">{t("noActive")}</p>}
        {active.map((s) => (
          <Row key={s.id}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{s.name}</p>
              <p className="text-stone-700">
                {s.city} · {tCat(s.category)} · {stripeState(s)}
                {s.isDemo ? ` · ${t("demoTag")}` : ""}
              </p>
            </div>
            <SalonReview salonId={s.id} salonName={s.name} status={s.status} />
          </Row>
        ))}
        {limitNote(active.length, activeTotal)}
      </Section>

      <Section id="payments" title={t("payments")}>
        {payments.length === 0 && <p className="text-sm text-stone-600">{t("noPayments")}</p>}
        {payments.map((b) => (
          <Row key={b.id}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">
                {b.slot.title} · {b.slot.salon.name}
              </p>
              <p className="text-stone-700">
                {formatInZone(b.createdAt, locale, "dayTime")} · {t(`row.${b.paymentMode}` as never)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold tabular-nums">{formatEuro(b.amount, locale)}</p>
              <p className="text-xs text-stone-600">{t("feeShort", { amount: formatEuro(b.feeAmount, locale) })}</p>
            </div>
          </Row>
        ))}
        {limitNote(payments.length, paymentsTotal)}
      </Section>

      {isDemoMode() && (
        <Section id="outbox" title={t("outbox")}>
          {outbox.length === 0 && <p className="text-sm text-stone-600">{t("outboxEmpty")}</p>}
          {outbox.map((mail) => (
            <Row key={mail.id}>
              <div className="min-w-0 flex-1">
                <p className="break-words font-semibold text-ink">{mail.subject}</p>
                <p className="break-all text-stone-700">
                  {mail.to} · {formatInZone(mail.createdAt, locale, "dayTime")}
                </p>
              </div>
              <StatusPill status={mail.status === "FAILED" ? "SUSPENDED" : "OPEN"} label={t(`mailStatus.${mail.status}` as never)} />
            </Row>
          ))}
        </Section>
      )}
    </div>
  );
}
