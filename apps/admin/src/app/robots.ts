import type { MetadataRoute } from "next";

// The admin panel is internal-only; never crawled, never indexed.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
