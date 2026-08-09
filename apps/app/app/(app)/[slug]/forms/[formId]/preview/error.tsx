"use client";

import { RouteError } from "@/components/shared";
import { homePath } from "@/lib/routes";

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
      homeHref={homePath()}
      homeLabel="Back to projects"
    />
  );
}
