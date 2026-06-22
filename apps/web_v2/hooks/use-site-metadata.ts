"use client";

import * as React from "react";
import { hostnameFromUrl } from "@/lib/favicon";

export interface SiteMetadata {
  url: string;
  host: string;
  siteName: string | null;
  title: string | null;
  description: string | null;
  themeColor: string | null;
  favicon: string | null;
  ogImage: string | null;
}

/**
 * Debounced fetch of `/api/site-metadata` for a free-text website URL. Returns
 * the resolved metadata (favicon, name, theme-colour, description) so a project
 * can be pre-branded from its own site. No-ops until the input parses as a host.
 */
export function useSiteMetadata(input: string, debounceMs = 600) {
  const [metadata, setMetadata] = React.useState<SiteMetadata | null>(null);
  const [loading, setLoading] = React.useState(false);

  const host = hostnameFromUrl(input);

  React.useEffect(() => {
    if (!host) {
      setMetadata(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/site-metadata?url=${encodeURIComponent(input.trim())}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as SiteMetadata;
        if (!cancelled) setMetadata(data);
      } catch {
        if (!cancelled) setMetadata(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(t);
    };
  }, [host, input, debounceMs]);

  return { metadata, loading };
}
