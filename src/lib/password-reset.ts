import { hash } from "bcryptjs";
import { prisma } from "./prisma";
import { secureToken, sha256 } from "./codes";
import { ApiError } from "./errors";
import { appUrl } from "./config";
import { localizedPath } from "@/i18n/config";
import { sendEmail } from "./email/send";
import { passwordResetEmail } from "./email/templates";

const TTL_MS = 60 * 60 * 1000;

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim().toLowerCase(), mode: "insensitive" }, anonymizedAt: null },
  });
  if (!user?.passwordHash) return;
  const token = secureToken();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TTL_MS) },
  });
  await sendEmail({
    to: user.email,
    template: "password_reset",
    ...passwordResetEmail(user.locale, user.name, `${appUrl()}${localizedPath(user.locale, `/wachtwoord-reset?token=${token}`)}`),
  });
}

export async function resetPassword(token: string, password: string) {
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) throw new ApiError(400, "invalid_token");
  const passwordHash = await hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    // Every link still open for this person is spent, not only the one used.
    prisma.passwordResetToken.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);
}
