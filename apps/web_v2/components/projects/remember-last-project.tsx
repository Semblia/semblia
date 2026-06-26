"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { setLastUsedProject } from "@/lib/semblia-api";

/**
 * Records the currently-open project slug in a cookie so the app can land the
 * user back on it next time (Clerk-style "last organization"). Read server-side
 * in `app/page.tsx`. Renders nothing.
 */
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function RememberLastProject({ slug }: { slug: string }) {
  const { getToken, isSignedIn } = useAuth();

  React.useEffect(() => {
    document.cookie = `last_project=${encodeURIComponent(
      slug,
    )}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;

    if (isSignedIn === false) return;

    let cancelled = false;
    void (async () => {
      try {
        const token = await getToken();
        if (!cancelled) {
          await setLastUsedProject(token, { slug });
        }
      } catch {
        // The cookie fallback still keeps navigation useful if persistence fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken, isSignedIn, slug]);

  return null;
}
