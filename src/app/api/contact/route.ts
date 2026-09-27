import { NextResponse } from "next/server";
import { z } from "zod";
import { route, parseBody, clientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendEmail, emailProviderConfigured } from "@/lib/email/send";
import { COMPANY } from "@/lib/config";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  topic: z.enum(["boeking", "zaak", "privacy", "anders"]),
  message: z.string().trim().min(10).max(2000),
});

export const POST = route(async (req) => {
  await enforceRateLimit(`contact:${clientIp(req)}`, 5, 60 * 60);
  const body = await parseBody(req, schema);
  const text = `${body.name} <${body.email}>\n${body.topic}\n\n${body.message}`;
  await sendEmail({
    to: COMPANY.email,
    subject: `Contact: ${body.topic}`,
    template: "contact",
    text,
    html: `<p>${text.replace(/</g, "").replace(/\n/g, "<br>")}</p>`,
  });
  return NextResponse.json({ ok: true, delivered: emailProviderConfigured() });
});
