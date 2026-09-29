import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/api/", "/boekingen", "/boeking/", "/uitnodigen", "/account", "/favorieten", "/login", "/register", "/wachtwoord-vergeten", "/wachtwoord-reset"],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
