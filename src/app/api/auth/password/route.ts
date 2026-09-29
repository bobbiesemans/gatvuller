import { NextResponse } from "next/server";
import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { route, requireUser, parseBody, ApiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { passwordSchema } from "@/lib/password-rules";

const schema = z.object({
  current: z.string().min(1).max(200),
  next: passwordSchema,
});

/**
 * Changing the password also ends every other session: the session version is derived from the hash
 * (see getCurrentUser). The caller signs in again with the new password.
 */
export const POST = route(async (req) => {
  const user = await requireUser();
  await enforceRateLimit(`pwchange:${user.id}`, 5, 60 * 60);
  const body = await parseBody(req, schema);
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row?.passwordHash || !(await compare(body.current, row.passwordHash))) throw new ApiError(400, "auth_password_wrong");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hash(body.next, 10) } });
  await audit(user.id, "password_changed", "user", user.id);
  return NextResponse.json({ ok: true });
});
