import { NextResponse, after } from "next/server";
import { z } from "zod";
import { route, parseBody, clientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requestPasswordReset } from "@/lib/password-reset";
import { log } from "@/lib/log";

const schema = z.object({ email: z.string().trim().email().max(120) });

/**
 * Always answers the same, and does the lookup and the mail after the response, so neither the body
 * nor the response time shows whether an address has an account.
 */
export const POST = route(async (req) => {
  await enforceRateLimit(`forgot:${clientIp(req)}`, 5, 60 * 60);
  const body = await parseBody(req, schema);
  after(async () => {
    try {
      await requestPasswordReset(body.email);
    } catch (error) {
      log.error("auth.forgot_failed", { error });
    }
  });
  return NextResponse.json({ ok: true });
});
