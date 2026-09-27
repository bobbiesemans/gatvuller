import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://gatvuller-validee-s-projects.vercel.app";
  const paths = [
    "",
    "/slots",
    "/favorieten",
    "/impact",
    "/login",
    "/register",
    "/dashboard",
  ];
  return paths.map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
    changeFrequency: p === "/slots" ? "hourly" : "weekly",
    priority: p === "" || p === "/slots" ? 1 : 0.6,
  }));
}
