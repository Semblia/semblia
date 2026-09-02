import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/pricing", "/terms", "/privacy"].map((path) => ({
    url: `https://semblia.com${path}`,
  }));
}
