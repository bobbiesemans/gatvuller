import { createHmac } from "crypto";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { hitRateLimit, rateLimitsDisabled } from "./rate-limit";
import { isDemoAccount, isDemoMode } from "./config";
import { clientIp } from "./api";
import { sha256 } from "./codes";

declare module "next-auth" {
  interface User {
    role: Role;
    /** Changes when the password changes; older sessions stop working (see getCurrentUser). */
    sv?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      sv?: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    sv?: string;
  }
}

/** Opaque fingerprint of the password hash. A reset or an erased account invalidates every session. */
export function sessionVersion(passwordHash: string | null | undefined) {
  if (!passwordHash) return "none";
  return createHmac("sha256", process.env.AUTH_SECRET || "gatvuller-dev-secret").update(passwordHash).digest("base64url").slice(0, 16);
}

class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === "production",
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        if (!rateLimitsDisabled()) {
          const ip = request ? clientIp(request as Request) : "local";
          const perIp = await hitRateLimit(`login-ip:${ip}`, 30, 15 * 60);
          const perAccount = await hitRateLimit(`login-acct:${sha256(email).slice(0, 20)}`, 10, 15 * 60);
          if (!perIp.ok || !perAccount.ok) throw new RateLimitedSignin();
        }

        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });
        if (!user?.passwordHash || user.anonymizedAt) return null;
        // Seed accounts have a published password: only in test mode, and the seed admin never in a production build.
        if (isDemoAccount(user.email) && (!isDemoMode() || (user.role === "ADMIN" && process.env.NODE_ENV === "production"))) {
          return null;
        }

        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role, sv: sessionVersion(user.passwordHash) };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.sv = user.sv;
      }
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true, name: true },
        });
        if (fresh) {
          token.role = fresh.role;
          token.name = fresh.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.sv = token.sv;
        if (token.name) session.user.name = token.name;
      }
      return session;
    },
  },
});
