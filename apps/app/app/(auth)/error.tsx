"use client";

import { RouteError } from "@/components/shared";

/** Error boundary for pre-auth pages (sign in / up, password reset). */
export default function AuthError({
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
      resource="this page"
      description="Nothing about your account was changed. Try again, or head back to sign in."
      homeHref="/sign-in"
      homeLabel="Back to sign in"
    />
  );
}
