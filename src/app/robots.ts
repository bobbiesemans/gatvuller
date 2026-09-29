import type { MetadataRoute } from "next";
import { appUrl, isDemoMode } from "@/lib/config";

/** Paths that need a sign-in, carry a secret or have no value in a search result. */
const PRIVATE = [
  "/admin",
  "/dashboard",
  "/api/",
  "/boekingen",
  "/boeking/",
  "/uitnodigen",
  "/account",
  "/favorieten",
  "/login",
  "/register",
  "/wachtwoord-vergeten",
  "/wachtwoord-reset",
];

export default function robots(): MetadataRoute.Robots {
  // A test environment (demo data, simulated payments) must not end up in a search engine.
  if (isDemoMode()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
