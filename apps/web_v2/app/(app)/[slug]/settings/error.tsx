"use client";

import { RouteError } from "@/components/shared";
import { homePath } from "@/lib/routes";

/**
 * Boundary scoped to the settings pane.
 *
 * Without it, a throw inside any settings page unwinds to the project-level
 * boundary and replaces the whole project view. Containing it here means "Try
 * again" re-renders only the settings form the user was working in.
 */
export default function SettingsError({
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
      resource="these project settings"
      homeHref={homePath()}
      homeLabel="Back to projects"
    />
  );
}
