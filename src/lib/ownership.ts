import type { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { ApiError } from "./errors";

export async function requireOwnedSalon(actor: { id: string; role: Role }, salonId: string) {
  const salon = await prisma.salon.findFirst({
    where: { id: salonId, ...(actor.role === "ADMIN" ? {} : { ownerId: actor.id }) },
  });
  if (!salon) throw new ApiError(404, "not_found");
  return salon;
}
