"use client";

import { RouteError } from "@/components/shared";

/**
 * Error boundary for the authenticated app. Renders inside `(app)/layout.tsx`,
 * so the top bar stays put while the failed view is replaced with a calm,
 * recoverable state instead of an abrupt crash.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} />;
}
