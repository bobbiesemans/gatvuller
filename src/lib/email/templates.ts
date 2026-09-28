import type { PaymentMode } from "@prisma/client";
import { translator } from "@/lib/i18n/translator";
import { discountPercent, formatEuro } from "@/lib/money";
import { formatInZone, formatRange } from "@/lib/time";
import { spacedCode } from "@/lib/utils";
import { codeBlock, detailsTable, emailLayout, esc, notice, paragraph, plainText, type DetailRow } from "./layout";

export type BookingEmailView = {
  code: string;
  locale: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  amount: number;
  feeAmount: number;
  feePercent: number;
  paymentMode: PaymentMode;
  slot: { title: string; startsAt: Date; endsAt: Date; originalPrice: number };
  salon: { name: string; address: string; cancellationHours: number };
};

type Rendered = { subject: string; html: string; text: string };

export type CancelReason = "CUSTOMER" | "SALON" | "ADMIN" | "EXPIRED" | "UNAVAILABLE";

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

function paymentNotice(mode: PaymentMode, t: ReturnType<typeof translator>) {
  if (mode === "DEMO") return t("testPayment");
  if (mode === "TEST") return t("stripeTestPayment");
  return null;
}

export function bookingConfirmedEmail(b: BookingEmailView, links: { voucher: string; calendar: string }): Rendered {
  const t = translator(b.locale, "emails");
  const rows: DetailRow[] = [
    [t("details.what"), b.slot.title],
    [t("details.salon"), b.salon.name],
    [t("details.when"), formatRange(b.slot.startsAt, b.slot.endsAt, b.locale)],
    [t("details.where"), b.salon.address],
    [t("details.paid"), formatEuro(b.amount, b.locale)],
  ];
  const policy = t("bookingConfirmed.policy", { hours: b.salon.cancellationHours });
  const warn = paymentNotice(b.paymentMode, t);
  return {
    subject: t("bookingConfirmed.subject", { title: b.slot.title, salon: b.salon.name }),
    html: emailLayout({
      lang: b.locale,
      preheader: t("bookingConfirmed.preheader", { code: b.code }),
      title: t("bookingConfirmed.title"),
      bodyHtml: [
        warn ? notice(warn) : "",
        paragraph(t("greeting", { name: firstName(b.customerName) })),
        paragraph(t("bookingConfirmed.intro")),
        codeBlock(t("codeLabel"), spacedCode(b.code)),
        detailsTable(rows),
        paragraph(policy, true),
      ].join(""),
      cta: { label: t("bookingConfirmed.cta"), href: links.voucher },
      secondary: { label: t("bookingConfirmed.calendar"), href: links.calendar },
      footer: t("footer"),
    }),
    text: plainText([
      warn,
      t("greeting", { name: firstName(b.customerName) }),
      t("bookingConfirmed.intro"),
      `${t("codeLabel")}: ${b.code}`,
      rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
      policy,
      `${t("bookingConfirmed.cta")}: ${links.voucher}`,
    ]),
  };
}

export function bookingReceivedEmail(b: BookingEmailView, ownerLocale: string, dashboardUrl: string): Rendered {
  const t = translator(ownerLocale, "emails");
  const time = formatInZone(b.slot.startsAt, ownerLocale, "dayTime");
  const rows: DetailRow[] = [
    [t("details.what"), b.slot.title],
    [t("details.when"), formatRange(b.slot.startsAt, b.slot.endsAt, ownerLocale)],
    [t("details.customer"), b.customerName],
    [t("details.contact"), [b.customerEmail, b.customerPhone].filter(Boolean).join(" · ")],
    [t("details.code"), spacedCode(b.code)],
    [t("details.paid"), formatEuro(b.amount, ownerLocale)],
    [t("details.fee", { percent: b.feePercent }), `− ${formatEuro(b.feeAmount, ownerLocale)}`],
    [t("details.net"), formatEuro(b.amount - b.feeAmount, ownerLocale)],
  ];
  const warn = paymentNotice(b.paymentMode, t);
  return {
    subject: t("bookingReceived.subject", { title: b.slot.title, time }),
    html: emailLayout({
      lang: ownerLocale,
      preheader: t("bookingReceived.preheader", { customer: b.customerName }),
      title: t("bookingReceived.title"),
      bodyHtml: [
        warn ? notice(warn) : "",
        paragraph(t("bookingReceived.intro", { customer: b.customerName, title: b.slot.title, salon: b.salon.name })),
        detailsTable(rows),
        paragraph(t("bookingReceived.checkin"), true),
      ].join(""),
      cta: { label: t("bookingReceived.cta"), href: dashboardUrl },
      footer: t("footer"),
    }),
    text: plainText([
      warn,
      t("bookingReceived.intro", { customer: b.customerName, title: b.slot.title, salon: b.salon.name }),
      rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
      t("bookingReceived.checkin"),
      dashboardUrl,
    ]),
  };
}

export function bookingCancelledEmail(
  b: BookingEmailView,
  reason: CancelReason,
  refundAmount: number,
  browseUrl: string
): Rendered {
  const t = translator(b.locale, "emails");
  const reasonText = {
    CUSTOMER: t("bookingCancelled.byCustomer"),
    SALON: t("bookingCancelled.bySalon", { salon: b.salon.name }),
    ADMIN: t("bookingCancelled.byAdmin"),
    EXPIRED: t("bookingCancelled.expired"),
    UNAVAILABLE: t("bookingCancelled.unavailable"),
  }[reason];
  const amount = formatEuro(refundAmount, b.locale);
  const refundText =
    refundAmount > 0
      ? b.paymentMode === "LIVE"
        ? t("bookingCancelled.refunded", { amount })
        : t("bookingCancelled.refundedTest", { amount })
      : t("bookingCancelled.noCharge");
  const rows: DetailRow[] = [
    [t("details.what"), b.slot.title],
    [t("details.salon"), b.salon.name],
    [t("details.when"), formatRange(b.slot.startsAt, b.slot.endsAt, b.locale)],
    [t("details.code"), spacedCode(b.code)],
  ];
  return {
    subject: t("bookingCancelled.subject", { title: b.slot.title, salon: b.salon.name }),
    html: emailLayout({
      lang: b.locale,
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
      lang: ownerLocale,
      preheader: intro,
      title: t("bookingCancelledSalon.title"),
      bodyHtml:
        paragraph(intro) +
        detailsTable([
          [t("details.when"), formatRange(b.slot.startsAt, b.slot.endsAt, ownerLocale)],
          [t("details.code"), spacedCode(b.code)],
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
      lang: locale,
      preheader: t("passwordReset.intro"),
      title: t("passwordReset.title"),
      bodyHtml:
        paragraph(t("greeting", { name: firstName(name) })) +
        paragraph(t("passwordReset.intro")) +
        paragraph(t("passwordReset.ignore"), true),
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
    [t("details.price"), `${formatEuro(slot.discountPrice, locale)} (${t("details.normal")} ${formatEuro(slot.originalPrice, locale)})`],
  ];
  return {
    subject: t("slotAlert.subject", { title: slot.title, salon: slot.salonName, percent: pct }),
    html: emailLayout({
      lang: locale,
      preheader: t("slotAlert.intro", { salon: slot.salonName }),
      title: t("slotAlert.title"),
      bodyHtml: paragraph(t("slotAlert.intro", { salon: slot.salonName })) + detailsTable(rows),
      cta: { label: t("slotAlert.cta"), href: slotUrl },
      secondary: { label: t("slotAlert.unsubscribe"), href: unsubscribeUrl },
      footer: t("footerAlerts"),
    }),
    text: plainText([
      t("slotAlert.intro", { salon: slot.salonName }),
      rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
      slotUrl,
      `${t("slotAlert.unsubscribe")}: ${unsubscribeUrl}`,
    ]),
  };
}

export function alertConfirmEmail(locale: string, what: string, confirmUrl: string): Rendered {
  const t = translator(locale, "emails");
  return {
    subject: t("alertConfirm.subject"),
    html: emailLayout({
      lang: locale,
      preheader: t("alertConfirm.intro", { what }),
      title: t("alertConfirm.title"),
      bodyHtml: paragraph(t("alertConfirm.intro", { what })) + paragraph(t("alertConfirm.ignore"), true),
      cta: { label: t("alertConfirm.cta"), href: confirmUrl },
      footer: t("footerAlerts"),
    }),
    text: plainText([t("alertConfirm.intro", { what }), confirmUrl, t("alertConfirm.ignore")]),
  };
}

export function reviewRequestEmail(locale: string, name: string, salonName: string, reviewUrl: string): Rendered {
  const t = translator(locale, "emails");
  return {
    subject: t("reviewRequest.subject", { salon: salonName }),
    html: emailLayout({
      lang: locale,
      preheader: t("reviewRequest.intro", { salon: salonName }),
      title: t("reviewRequest.title"),
      bodyHtml: paragraph(t("greeting", { name: firstName(name) })) + paragraph(t("reviewRequest.intro", { salon: salonName })),
      cta: { label: t("reviewRequest.cta"), href: reviewUrl },
      footer: t("footer"),
    }),
    text: plainText([t("reviewRequest.intro", { salon: salonName }), reviewUrl]),
  };
}

export function welcomeSalonEmail(locale: string, name: string, salonName: string, ctaUrl: string): Rendered {
  const t = translator(locale, "emails");
  return {
    subject: t("welcomeSalon.subject", { salon: salonName }),
    html: emailLayout({
      lang: locale,
      preheader: t("welcomeSalon.intro"),
      title: t("welcomeSalon.title"),
      bodyHtml:
        paragraph(t("greeting", { name: firstName(name) })) +
        paragraph(t("welcomeSalon.intro")) +
        paragraph(t("welcomeSalon.steps"), true),
      cta: { label: t("welcomeSalon.cta"), href: ctaUrl },
      footer: t("footer"),
    }),
    text: plainText([t("welcomeSalon.intro"), t("welcomeSalon.steps"), ctaUrl]),
  };
}

export function salonApprovedEmail(locale: string, name: string, salonName: string, ctaUrl: string, needsPayouts: boolean): Rendered {
  const t = translator(locale, "emails");
  return {
    subject: t("salonApproved.subject", { salon: salonName }),
    html: emailLayout({
      lang: locale,
      preheader: t("salonApproved.intro"),
      title: t("salonApproved.title"),
      bodyHtml:
        paragraph(t("greeting", { name: firstName(name) })) +
        paragraph(t("salonApproved.intro")) +
        (needsPayouts ? notice(t("salonApproved.payouts")) : ""),
      cta: { label: t("salonApproved.cta"), href: ctaUrl },
      footer: t("footer"),
    }),
    text: plainText([t("salonApproved.intro"), needsPayouts && t("salonApproved.payouts"), ctaUrl]),
  };
}

/** Internal mail for the team; always Dutch. */
export function adminNoticeEmail(subject: string, lines: string[], link: string): Rendered {
  return {
    subject: `[GatVuller] ${subject}`,
    html: emailLayout({
      preheader: subject,
      title: subject,
      bodyHtml: lines.map((line) => paragraph(line)).join(""),
      cta: { label: "Open het beheer", href: link },
      footer: "Interne melding voor het GatVuller-team.",
    }),
    text: plainText([...lines, link]),
  };
}

export function contactEmail(input: { name: string; email: string; topic: string; message: string }): Rendered {
  const lines = [`Van: ${input.name} <${input.email}>`, `Onderwerp: ${input.topic}`];
  return {
    subject: `[GatVuller contact] ${input.topic}`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6">${lines.map((l) => `<p>${esc(l)}</p>`).join("")}<pre style="white-space:pre-wrap;font-family:inherit">${esc(input.message)}</pre></div>`,
    text: plainText([...lines, input.message]),
  };
}
