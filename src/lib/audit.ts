import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string,
  meta?: Prisma.InputJsonValue
) {
  try {
    await prisma.auditLog.create({ data: { actorId, action, entity, entityId, meta } });
  } catch (err) {
    console.error("[audit]", action, entity, entityId, err);
  }
}
