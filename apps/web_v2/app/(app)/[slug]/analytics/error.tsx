"use client";

import { useParams } from "next/navigation";
import { RouteError } from "@/components/shared";
import { projectPath } from "@/lib/routes";

/**
 * Analytics is the most render-heavy surface in a project and the one most
 * exposed to hand-edited query parameters, so a throw here is contained to the
 * analytics body rather than taking down the whole project shell.
 */
export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ slug?: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : null;

  return (
    <RouteError
      error={error}
      reset={reset}
      resource="analytics"
      homeHref={slug ? projectPath(slug) : "/"}
      homeLabel={slug ? "Back to project" : "Back to projects"}
    />
  );
}
