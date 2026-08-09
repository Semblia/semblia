"use client";

import { RouteError } from "@/components/shared";

/**
 * Catch-all error boundary for any route segment not covered by a more
 * specific boundary (e.g. ungrouped routes like `/design`). Renders inside the
 * root layout, so the app providers and theme are available.
 */
export default function RootSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} />;
}
