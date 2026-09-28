import { visibleSalonWhere } from "@/lib/marketplace";
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { CITIES, CATEGORIES, LAUNCHED_CATEGORIES, LAUNCHED_CITIES } from "@/lib/catalog";
import { appUrl } from "@/lib/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const staticPaths = ["", "/slots", "/voorwaarden", "/privacy", "/contact", "/voor-zaken", "/register", "/login"];
  const cities = CITIES.map((city) => `/stad/${city.slug}`);
  const categories = CATEGORIES.map((category) => `/categorie/${category.slug}`);
  const cityCategories = LAUNCHED_CITIES.flatMap((city) => LAUNCHED_CATEGORIES.map((category) => `/stad/${city.slug}/${category.slug}`));
  let salons: { slug: string; updatedAt: Date }[] = [];
  try {
    salons = await prisma.salon.findMany({
      where: visibleSalonWhere(),
      select: { slug: true, updatedAt: true },
    });
  } catch {
    salons = [];
  }

  return [
    ...[...staticPaths, ...cities, ...categories, ...cityCategories].map((path) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
      changeFrequency: path === "/slots" ? "hourly" as const : "weekly" as const,
      priority: path === "" || path === "/slots" ? 1 : 0.6,
    })),
    ...salons.map((salon) => ({
      url: `${base}/salon/${salon.slug}`,
      lastModified: salon.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
