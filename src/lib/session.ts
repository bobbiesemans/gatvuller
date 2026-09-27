import { cache } from "react";
import type { Role } from "@prisma/client";
import { auth } from "./auth";
import { prisma } from "./prisma";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  locale: string;
  phone: string | null;
};

/** Reads the role from the database so demotions and account deletion apply immediately, not at JWT expiry. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, locale: true, phone: true, anonymizedAt: true },
  });
  if (!user || user.anonymizedAt) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale, phone: user.phone };
});
