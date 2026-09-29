import { prisma } from "@/lib/prisma";
import { COMPANY, isDemoMode } from "@/lib/config";
import { log } from "@/lib/log";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  template: string;
  replyTo?: string;
};

export function emailProviderConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Sends through Resend when configured.
 * Without a provider in test mode the rendered mail goes to the outbox (EmailLog, visible to admins).
 * Without a provider in production nothing is sent, the failure is logged and shown in the admin
 * health check, and the HTML (which can hold voucher links) is not stored.
 * Never throws: a mail failure must not undo a booking.
 */
export async function sendEmail(mail: OutgoingEmail) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || `${COMPANY.brand} <noreply@gatvuller.be>`;

  if (!key) {
    const demo = isDemoMode();
    await prisma.emailLog
      .create({
        data: {
          to: mail.to,
          subject: mail.subject,
          template: mail.template,
          status: demo ? "LOGGED" : "FAILED",
          error: demo ? null : "no_provider",
          html: demo ? mail.html : null,
        },
      })
      .catch(() => undefined);
    if (!demo) log.error("email.no_provider", { template: mail.template });
    return { ok: demo, logged: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        reply_to: mail.replyTo || COMPANY.email,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    await prisma.emailLog
      .create({ data: { to: mail.to, subject: mail.subject, template: mail.template, status: "SENT", providerId: data.id ?? null } })
      .catch(() => undefined);
    return { ok: true, logged: false };
  } catch (error) {
    log.error("email.send_failed", { template: mail.template, error });
    await prisma.emailLog
      .create({
        data: {
          to: mail.to,
          subject: mail.subject,
          template: mail.template,
          status: "FAILED",
          error: (error instanceof Error ? error.message : String(error)).slice(0, 300),
        },
      })
      .catch(() => undefined);
    return { ok: false, logged: false };
  }
}
