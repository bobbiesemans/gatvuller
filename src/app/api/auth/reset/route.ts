import { NextResponse } from "next/server";
import { z } from "zod";
import { route, parseBody } from "@/lib/api";
import { resetPassword } from "@/lib/password-reset";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(80),
});

export const POST = route(async (req) => {
  const body = await parseBody(req, schema);
  await resetPassword(body.token, body.password);
  return NextResponse.json({ ok: true });
});
