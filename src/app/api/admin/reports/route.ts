import { NextResponse } from "next/server";
import { z } from "zod";
import { route, requireUser, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import { audit } from "@/lib/audit";

const schema = z.object({
  id: z.string().min(1).max(40),
  status: z.enum(["RESOLVED", "DISMISSED"]),
});

export const POST = route(async (req) => {
  const admin = await requireUser(["ADMIN"]);
  const body = await parseBody(req, schema);
  const report = await prisma.report.findUnique({ where: { id: body.id } });
  if (!report) throw new ApiError(404, "not_found");
  if (report.status !== "OPEN") throw new ApiError(409, "invalid_transition");
  await prisma.report.update({
    where: { id: report.id },
    data: { status: body.status, resolvedAt: new Date(), resolvedById: admin.id },
  });
  await audit(admin.id, "report_closed", "report", report.id, { status: body.status });
  return NextResponse.json({ ok: true });
});
