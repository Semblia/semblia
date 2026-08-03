"use client";

import * as React from "react";

/**
 * A clock the key surfaces can read during render without lying.
 *
 * Expiry is the only thing on these screens that changes without an API call,
 * and both mistakes have shipped here before: reading `Date.now()` inside the
 * render pass is impure and gave the row badge and the status filter different
 * answers, while freezing a module-level timestamp meant a key that lapsed
 * mid-session never moved into Expired.
 *
 * One ticking value, read once per render pass by every derivation, fixes both.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
