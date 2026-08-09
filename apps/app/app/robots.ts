import type { MetadataRoute } from "next";

// The control plane is denied entirely. Public walls live on their own
// `<label>.walls.semblia.com` hosts with their own robots route — the apex
// `/wall/:slug` adapter is gone (subdomain-only doctrine, WS-A1).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
