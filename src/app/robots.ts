import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/api/", "/boekingen", "/boeking/", "/uitnodigen"],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
