"use client";

import { RouteError } from "@/components/shared";

/** Error boundary for standalone pages (welcome, legal). */
export default function StandaloneError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      homeHref="/"
      homeLabel="Back to home"
    />
  );
}
