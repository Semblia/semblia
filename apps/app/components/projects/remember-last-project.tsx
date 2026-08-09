"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { setLastUsedProject } from "@/lib/semblia-api";

/**
 * Records the currently-open project as the account's last-used one
 * (`PUT /me/last-used-project`). Renders nothing.
 *
 * `/continue` — where every completed sign-in lands — is what reads it back,
 * so this write is the whole reason an owner is returned to the project they
 * were working in instead of a list. Server-owned, not a cookie: the API
 * re-checks access before answering, which a cookie could never do, and the
 * value follows the account across browsers.
 */
export function RememberLastProject({ slug }: { slug: string }) {
  const { getToken, isSignedIn } = useAuth();

  React.useEffect(() => {
    // Only once Clerk has actually confirmed a session. While `isSignedIn` is
    // still `undefined` the token isn't minted yet, so firing here sent an
    // unauthenticated write that could only 401.
    if (!isSignedIn) return;

    let cancelled = false;
    void (async () => {
      try {
        const token = await getToken();
        if (!cancelled) {
          await setLastUsedProject(token, { slug });
        }
      } catch {
        // Best-effort: failing to remember where you were must never interrupt
        // the project you are actually looking at. `/continue` falls back to
        // the project list when there is nothing recorded.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken, isSignedIn, slug]);

  return null;
}
