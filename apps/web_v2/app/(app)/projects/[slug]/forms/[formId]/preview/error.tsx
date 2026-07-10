"use client";

import { RouteError } from "@/components/shared";

/** Boundary for the full-page form preview — recover without losing the tab. */
export default function FormPreviewError({
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
      homeHref="/projects"
      homeLabel="Back to projects"
    />
  );
}
