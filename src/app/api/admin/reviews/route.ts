import { NextResponse } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import { audit } from "@/lib/audit";

const schema = z.object({
  id: z.string().min(1).max(40),
  hidden: z.boolean(),
});

export const POST = route(async (req) => {
  const admin = await requireUser(["ADMIN"]);
  const body = await parseBody(req, schema);
  const review = await prisma.review.findUnique({ where: { id: body.id } });
  if (!review) throw new ApiError(404, "not_found");
  await prisma.review.update({ where: { id: review.id }, data: { hidden: body.hidden } });
  await audit(admin.id, body.hidden ? "review_hidden" : "review_shown", "review", review.id);
  return NextResponse.json({ ok: true });
});
