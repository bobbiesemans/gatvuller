import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/config";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  template: string;
};

export function emailProviderConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Sends through Resend when configured; otherwise stores the rendered mail in the outbox
 * (EmailLog, visible in /admin/emails) so flows stay testable without a provider.
 * Never throws: a mail failure must not roll back a booking.
 */
export async function sendEmail(mail: OutgoingEmail) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || `${COMPANY.brand} <noreply@gatvuller.be>`;

  if (!key) {
    await prisma.emailLog
      .create({ data: { to: mail.to, subject: mail.subject, template: mail.template, status: "LOGGED", html: mail.html } })
      .catch(() => undefined);
    if (process.env.NODE_ENV === "development") console.info(`[email:outbox] ${mail.template} → ${mail.to}: ${mail.subject}`);
    return { ok: true as const, logged: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text, reply_to: COMPANY.email }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    await prisma.emailLog
      .create({ data: { to: mail.to, subject: mail.subject, template: mail.template, status: "SENT", providerId: data.id ?? null } })
      .catch(() => undefined);
    return { ok: true as const, logged: false };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[email] ${mail.template} → ${mail.to} failed: ${error}`);
    await prisma.emailLog
      .create({ data: { to: mail.to, subject: mail.subject, template: mail.template, status: "FAILED", error: error.slice(0, 500) } })
      .catch(() => undefined);
    return { ok: false as const, logged: false };
  }
}
