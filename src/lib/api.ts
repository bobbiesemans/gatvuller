import { NextResponse } from "next/server";
import { z, type ZodType } from "zod";
import type { Role } from "@prisma/client";
import { getCurrentUser, type CurrentUser } from "./session";
import { ApiError } from "./errors";

export { ApiError };

export function jsonError(status: number, code: string, details?: unknown) {
  return NextResponse.json({ error: code, ...(details ? { details } : {}) }, { status });
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) return jsonError(err.status, err.code, err.details);
      console.error("[api]", req.method, new URL(req.url).pathname, err);
      return jsonError(500, "server_error");
    }
  };
}

export async function requireUser(roles?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "unauthenticated");
  if (roles && !roles.includes(user.role)) throw new ApiError(403, "forbidden");
  return user;
}

export async function parseBody<T extends ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    throw new ApiError(400, "invalid_json");
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ApiError(400, "invalid_input", z.flattenError(parsed.error).fieldErrors);
  return parsed.data;
}

export function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
