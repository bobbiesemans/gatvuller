import { NextResponse } from "next/server";
import { z } from "zod";
import { route, parseBody, clientIp, ApiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendEmail, emailProviderConfigured } from "@/lib/email/send";
import { contactEmail } from "@/lib/email/templates";
import { COMPANY } from "@/lib/config";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  topic: z.enum(["booking", "business", "privacy", "other"]),
  message: z.string().trim().min(10).max(2000),
});

export const POST = route(async (req) => {
  await enforceRateLimit(`contact:${clientIp(req)}`, 5, 60 * 60);
  const body = await parseBody(req, schema);
  const result = await sendEmail({
    to: body.topic === "privacy" ? COMPANY.privacyEmail : COMPANY.email,
    template: "contact",
    replyTo: body.email,
    ...contactEmail(body),
  });
  // Without a mail provider the message is kept in the test outbox (delivered: false); in production that is a failure.
  if (!result.ok) throw new ApiError(502, "contact_failed");
  return NextResponse.json({ ok: true, delivered: emailProviderConfigured() });
});
