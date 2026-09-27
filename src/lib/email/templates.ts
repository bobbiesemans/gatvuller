import { translator } from "@/lib/i18n/translator";
import { discountPercent, formatEuro } from "@/lib/utils";
import { formatInZone, formatRange } from "@/lib/time";
import { codeBlock, detailsTable, emailLayout, paragraph, plainText, type DetailRow } from "./layout";

export type BookingEmailView = {
  code: string;
  locale: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  amount: number;
  feeAmount: number;
  feePercent: number;
  slot: { title: string; startsAt: Date; endsAt: Date; originalPrice: number };
  salon: { name: string; address: string; cancellationHours: number };
};

type Rendered = { subject: string; html: string; text: string };

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

export function bookingConfirmedEmail(
  b: BookingEmailView,
  links: { voucher: string; calendar: string },
  demo: boolean
): Rendered {
  const t = translator(b.locale, "emails");
  const when = formatRange(b.slot.startsAt, b.slot.endsAt, b.locale);
  const rows: DetailRow[] = [
    [t("details.what"), b.slot.title],
    [t("details.salon"), b.salon.name],
    [t("details.when"), when],
    [t("details.where"), b.salon.address],
    [t("details.paid"), formatEuro(b.amount, b.locale)],
  ];
  const policy = t("bookingConfirmed.policy", { hours: b.salon.cancellationHours });
  return {
    subject: t("bookingConfirmed.subject", { title: b.slot.title, salon: b.salon.name }),
    html: emailLayout({
      preheader: t("bookingConfirmed.preheader", { code: b.code }),
      title: t("bookingConfirmed.title"),
      bodyHtml: [
        paragraph(t("greeting", { name: firstName(b.customerName) })),
        paragraph(t("bookingConfirmed.intro")),
        codeBlock(b.code),
        detailsTable(rows),
        paragraph(policy, true),
        demo ? paragraph(t("bookingConfirmed.demo"), true) : "",
      ].join(""),
      cta: { label: t("bookingConfirmed.cta"), href: links.voucher },
      secondary: { label: t("bookingConfirmed.calendar"), href: links.calendar },
      footer: t("footer"),
    }),
    text: plainText([
      t("greeting", { name: firstName(b.customerName) }),
      t("bookingConfirmed.intro"),
      `${t("details.code")}: ${b.code}`,
      rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
      policy,
      demo && t("bookingConfirmed.demo"),
      `${t("bookingConfirmed.cta")}: ${links.voucher}`,
    ]),
  };
}

export function bookingReceivedEmail(b: BookingEmailView, ownerLocale: string, dashboardUrl: string): Rendered {
  const t = translator(ownerLocale, "emails");
  const time = formatInZone(b.slot.startsAt, ownerLocale, "dayTime");
  const net = b.amount - b.feeAmount;
  const rows: DetailRow[] = [
    [t("details.what"), b.slot.title],
    [t("details.when"), formatRange(b.slot.startsAt, b.slot.endsAt, ownerLocale)],
    [t("details.customer"), b.customerName],
    [t("details.contact"), [b.customerEmail, b.customerPhone].filter(Boolean).join(" · ")],
    [t("details.code"), b.code],
    [t("details.paid"), formatEuro(b.amount, ownerLocale)],
    [t("details.fee", { percent: b.feePercent }), `− ${formatEuro(b.feeAmount, ownerLocale)}`],
    [t("details.net"), formatEuro(net, ownerLocale)],
  ];
  return {
    subject: t("bookingReceived.subject", { title: b.slot.title, time }),
    html: emailLayout({
      preheader: t("bookingReceived.preheader", { customer: b.customerName }),
      title: t("bookingReceived.title"),
      bodyHtml: [
        paragraph(t("bookingReceived.intro", { customer: b.customerName, salon: b.salon.name })),
        detailsTable(rows),
        paragraph(t("bookingReceived.checkin"), true),
      ].join(""),
      cta: { label: t("bookingReceived.cta"), href: dashboardUrl },
      footer: t("footer"),
    }),
    text: plainText([
      t("bookingReceived.intro", { customer: b.customerName, salon: b.salon.name }),
      rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
      t("bookingReceived.checkin"),
      dashboardUrl,
    ]),
  };
}

export type CancelReason = "CUSTOMER" | "SALON" | "ADMIN" | "EXPIRED";

export function bookingCancelledEmail(
  b: BookingEmailView,
  reason: CancelReason,
  refund: { amount: number; demo: boolean },
  browseUrl: string
): Rendered {
  const t = translator(b.locale, "emails");
  const reasonText =
    reason === "SALON"
      ? t("bookingCancelled.bySalon", { salon: b.salon.name })
      : reason === "ADMIN"
        ? t("bookingCancelled.byAdmin")
        : reason === "EXPIRED"
          ? t("bookingCancelled.expired")
          : t("bookingCancelled.byCustomer");
  const refundText =
    refund.amount > 0
      ? t("bookingCancelled.refunded", { amount: formatEuro(refund.amount, b.locale) })
      : t("bookingCancelled.noCharge");
  const rows: DetailRow[] = [
    [t("details.what"), b.slot.title],
    [t("details.salon"), b.salon.name],
    [t("details.when"), formatRange(b.slot.startsAt, b.slot.endsAt, b.locale)],
    [t("details.code"), b.code],
  ];
  return {
    subject: t("bookingCancelled.subject", { title: b.slot.title, salon: b.salon.name }),
    html: emailLayout({
      preheader: reasonText,
      title: t("bookingCancelled.title"),
      bodyHtml: [
        paragraph(t("greeting", { name: firstName(b.customerName) })),
        paragraph(reasonText),
        detailsTable(rows),
        paragraph(refundText, true),
      ].join(""),
      cta: { label: t("bookingCancelled.cta"), href: browseUrl },
      footer: t("footer"),
    }),
    text: plainText([reasonText, rows.map(([k, v]) => `${k}: ${v}`).join("\n"), refundText, browseUrl]),
  };
}

export function bookingCancelledSalonEmail(b: BookingEmailView, ownerLocale: string, dashboardUrl: string): Rendered {
  const t = translator(ownerLocale, "emails");
  const time = formatInZone(b.slot.startsAt, ownerLocale, "dayTime");
  const intro = t("bookingCancelledSalon.intro", { customer: b.customerName, title: b.slot.title });
  return {
    subject: t("bookingCancelledSalon.subject", { title: b.slot.title, time }),
    html: emailLayout({
      preheader: intro,
      title: t("bookingCancelledSalon.title"),
      bodyHtml: paragraph(intro) + detailsTable([
        [t("details.when"), formatRange(b.slot.startsAt, b.slot.endsAt, ownerLocale)],
        [t("details.code"), b.code],
      ]),
      cta: { label: t("bookingCancelledSalon.cta"), href: dashboardUrl },
      footer: t("footer"),
    }),
    text: plainText([intro, dashboardUrl]),
  };
}

export function passwordResetEmail(locale: string, name: string, link: string): Rendered {
  const t = translator(locale, "emails");
  return {
    subject: t("passwordReset.subject"),
    html: emailLayout({
      preheader: t("passwordReset.intro"),
      title: t("passwordReset.title"),
      bodyHtml: paragraph(t("greeting", { name: firstName(name) })) + paragraph(t("passwordReset.intro")) + paragraph(t("passwordReset.ignore"), true),
      cta: { label: t("passwordReset.cta"), href: link },
      footer: t("footer"),
    }),
    text: plainText([t("passwordReset.intro"), link, t("passwordReset.ignore")]),
  };
}

export type AlertSlotView = {
  title: string;
  salonName: string;
  startsAt: Date;
  endsAt: Date;
  originalPrice: number;
  discountPrice: number;
};

export function slotAlertEmail(locale: string, slot: AlertSlotView, slotUrl: string, unsubscribeUrl: string): Rendered {
  const t = translator(locale, "emails");
  const pct = discountPercent(slot.originalPrice, slot.discountPrice);
  const rows: DetailRow[] = [
    [t("details.what"), slot.title],
    [t("details.salon"), slot.salonName],
    [t("details.when"), formatRange(slot.startsAt, slot.endsAt, locale)],
    [t("details.price"), `${formatEuro(slot.discountPrice, locale)} (−${pct}%)`],
  ];
  return {
    subject: t("slotAlert.subject", { title: slot.title, percent: pct }),
    html: emailLayout({
      preheader: t("slotAlert.intro", { salon: slot.salonName }),
      title: t("slotAlert.title"),
      bodyHtml: paragraph(t("slotAlert.intro", { salon: slot.salonName })) + detailsTable(rows),
      cta: { label: t("slotAlert.cta"), href: slotUrl },
      secondary: { label: t("slotAlert.unsubscribe"), href: unsubscribeUrl },
      footer: t("footer"),
    }),
    text: plainText([t("slotAlert.intro", { salon: slot.salonName }), rows.map(([k, v]) => `${k}: ${v}`).join("\n"), slotUrl, `${t("slotAlert.unsubscribe")} ${unsubscribeUrl}`]),
  };
}

export function reviewRequestEmail(locale: string, name: string, salonName: string, reviewUrl: string): Rendered {
  const t = translator(locale, "emails");
  return {
    subject: t("reviewRequest.subject", { salon: salonName }),
    html: emailLayout({
      preheader: t("reviewRequest.intro", { salon: salonName }),
      title: t("reviewRequest.title"),
      bodyHtml: paragraph(t("greeting", { name: firstName(name) })) + paragraph(t("reviewRequest.intro", { salon: salonName })),
      cta: { label: t("reviewRequest.cta"), href: reviewUrl },
      footer: t("footer"),
    }),
    text: plainText([t("reviewRequest.intro", { salon: salonName }), reviewUrl]),
  };
}

export function welcomeEmail(locale: string, name: string, kind: "customer" | "salon", ctaUrl: string, salonName?: string): Rendered {
  const t = translator(locale, "emails");
  const ns = kind === "salon" ? "welcomeSalon" : "welcomeCustomer";
  const values = { salon: salonName ?? name };
  return {
    subject: t(`${ns}.subject`, values),
    html: emailLayout({
      preheader: t(`${ns}.intro`),
      title: t(`${ns}.title`),
      bodyHtml: paragraph(t("greeting", { name: firstName(name) })) + paragraph(t(`${ns}.intro`)) + paragraph(t(`${ns}.steps`), true),
      cta: { label: t(`${ns}.cta`), href: ctaUrl },
      footer: t("footer"),
    }),
    text: plainText([t(`${ns}.intro`), t(`${ns}.steps`), ctaUrl]),
  };
}
