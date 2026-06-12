import type { MetadataRoute } from "next";

// web_v2 is the authenticated control plane — nothing here should be crawled
// or indexed. Public form surfaces live on forms_runtime, not this app.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
