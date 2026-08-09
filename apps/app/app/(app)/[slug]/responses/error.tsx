"use client";

import { RouteError } from "@/components/shared/route-error";

export default function ResponsesRouteError({
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
      homeHref={null}
      title="Couldn't open responses"
    />
  );
}
