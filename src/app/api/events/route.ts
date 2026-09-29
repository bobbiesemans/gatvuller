import { NextResponse } from "next/server";
import { z } from "zod";
import { route, parseBody, clientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { CLIENT_EVENTS, recordEvent } from "@/lib/analytics";

const schema = z.object({
  name: z.enum(CLIENT_EVENTS),
  entityId: z.string().max(64).optional(),
  source: z.string().max(40).optional(),
});

/** Funnel events from the browser: no user id, no IP, no free text is stored. */
export const POST = route(async (req) => {
  await enforceRateLimit(`event:${clientIp(req)}`, 60, 60);
  const body = await parseBody(req, schema);
  const entityType = body.name === "filter_used" ? "filter" : "slot";
  await recordEvent(body.name, { entityType, entityId: body.entityId, source: body.source });
  return NextResponse.json({ ok: true });
});
