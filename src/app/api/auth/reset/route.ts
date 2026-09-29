import { NextResponse } from "next/server";
import { z } from "zod";
import { route, parseBody, clientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resetPassword } from "@/lib/password-reset";
import { passwordSchema } from "@/lib/password-rules";

const schema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export const POST = route(async (req) => {
  await enforceRateLimit(`reset:${clientIp(req)}`, 10, 60 * 60);
  const body = await parseBody(req, schema);
  await resetPassword(body.token, body.password);
  return NextResponse.json({ ok: true });
});
