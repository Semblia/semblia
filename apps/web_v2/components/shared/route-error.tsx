"use client";

import * as React from "react";
import Link from "next/link";
import {
  WarningOctagon as WarningIcon,
  ArrowClockwise as RetryIcon,
  House as HomeIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";

export interface RouteErrorProps {
  /** The error caught by the boundary. Logged, never shown verbatim. */
  error: Error & { digest?: string };
  /** Re-render the failed segment. Provided by Next.js error boundaries. */
  reset?: () => void;
  /**
   * What failed to load, as a lowercase noun phrase: "this project",
   * "your account". Error copy names the resource — "Something went wrong"
   * tells the user nothing about what to do next, and is banned.
   */
  resource?: string;
  /** Override the whole headline, when `resource` can't express it. */
  title?: string;
  /** Override the supporting copy. */
  description?: React.ReactNode;
  /** Show a link back to a safe page. Defaults to "/". Pass `null` to hide. */
  homeHref?: string | null;
  /** Label for the home link. */
  homeLabel?: string;
  className?: string;
}

/**
 * Shared, system-native fallback for App Router `error.tsx` boundaries.
 *
 * The job of every error boundary here is the same: when a segment throws,
 * the user should see a quiet, recoverable state — never a raw stack trace or
 * a blank screen. Full error detail is logged to the console for developers;
 * the UI stays generic. A short `digest` is surfaced so support can correlate
 * a report with server logs without exposing internals.
 */
export function RouteError({
  error,
  reset,
  resource = "this view",
  title,
  description = "Nothing was changed. Try again, and if it keeps happening, quote the reference below.",
  homeHref = "/",
  homeLabel = "Back to projects",
  className,
}: RouteErrorProps) {
  const headline = title ?? `Couldn't load ${resource}`;
  React.useEffect(() => {
    // Surface the real error to developers / monitoring, not to the user.
    console.error("[route-error]", error);
  }, [error]);

  return (
    <Empty
      className={cn("min-h-[60vh] border-none bg-transparent p-6", className)}
    >
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-10 bg-destructive/10 text-destructive [&_svg:not([class*='size-'])]:size-5"
        >
          <WarningIcon weight="duotone" />
        </EmptyMedia>
        <EmptyTitle className="text-base">{headline}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>

      <EmptyContent>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {reset && (
            <Button size="sm" onClick={reset} className="gap-1.5">
              <RetryIcon className="size-3.5" weight="bold" aria-hidden />
              Try again
            </Button>
          )}
          {homeHref && (
            <Button
              asChild
              size="sm"
              variant={reset ? "outline" : "default"}
              className="gap-1.5"
            >
              <Link href={homeHref}>
                <HomeIcon className="size-3.5" weight="bold" aria-hidden />
                {homeLabel}
              </Link>
            </Button>
          )}
        </div>

        {error.digest && (
          <p className="font-mono text-[11px] text-muted-foreground/70">
            Reference: {error.digest}
          </p>
        )}
      </EmptyContent>
    </Empty>
  );
}
