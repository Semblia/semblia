import type { MetadataRoute } from "next";

// The control plane remains denied. The narrower legacy wall path stays
// crawlable until the managed wildcard is activated and apex URLs redirect.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/wall/",
      disallow: "/",
    },
  };
}
