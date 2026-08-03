"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { setLastUsedProject } from "@/lib/semblia-api";

/**
 * Records the currently-open project as the account's last-used one, in a
 * cookie and in the API (`PUT /me/last-used-project`). Renders nothing.
 *
 * Both writes are currently write-only in this app: `fetchLastUsedProject`
 * (`lib/semblia-api.ts`) has no caller, and nothing reads the `last_project`
 * cookie — the doc comment here used to claim `app/page.tsx` did, and that file
 * does not exist. The writes are kept because the server owns the value and
 * other clients may read it; the missing "land me back where I was" behaviour
 * is a product decision, not something to restore silently.
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
