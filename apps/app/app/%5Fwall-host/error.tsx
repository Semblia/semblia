"use client";

import { RouteError } from "@/components/shared/route-error";

/** UI fallback only; the proxy and route handlers own HTTP status responses. */
export default function HostedWallError({
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
      title="Unable to load this wall"
      description="Please try again shortly."
      homeHref={null}
    />
  );
}
