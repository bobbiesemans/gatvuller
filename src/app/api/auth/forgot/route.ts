import { NextResponse } from "next/server";
import { z } from "zod";
import { route, parseBody, clientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requestPasswordReset } from "@/lib/password-reset";

const schema = z.object({ email: z.string().trim().email() });

export const POST = route(async (req) => {
  await enforceRateLimit(`forgot:${clientIp(req)}`, 5, 60 * 60);
  const body = await parseBody(req, schema);
  await requestPasswordReset(body.email);
  return NextResponse.json({ ok: true });
});
