"use client";

/**
 * EmptyState — the house empty-state system.
 *
 * An empty screen is not "you have nothing"; it's "here is what you're
 * missing, and the one step to get it." So the default composition pairs a
 * faint, decorative ghost of the *populated* surface (GhostList) with a single
 * decisive CTA. Use the `filtered` tone (or <NoResults />) for the lighter
 * "your search/filter matched nothing" case — that one strands no value, so it
 * stays quiet and offers a way back.
 *
 * Reuses the same Quiet Precision tokens as the rest of the app (brand/12
 * accent, font-heading, animate-fade-up) so it reads as native, never bolted on.
 */

import * as React from "react";
import {
  type Icon as PhosphorIcon,
  WarningOctagon,
  LockKey,
  MagnifyingGlass,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ── Ghost preview ────────────────────────────────────────────────────────────
//
// A faint, non-interactive mock of the rows this surface will hold once it's in
// use. Decorative only (aria-hidden) and masked to fade out at the bottom so it
// reads as "…and more below" rather than a broken list.

export interface GhostListProps {
  /** Number of placeholder rows. */
  rows?: number;
  /** Leading shape: round avatar (people) or rounded square (objects/keys). */
  leading?: "circle" | "square" | "none";
  /** Show a trailing status pill on each row. */
  trailingPill?: boolean;
  className?: string;
}

/** Width sequence so successive rows don't look mechanically identical. */
const LINE_WIDTHS = ["w-28", "w-40", "w-32", "w-44", "w-24"];
const SUBLINE_WIDTHS = ["w-44", "w-36", "w-48", "w-32", "w-40"];

export function GhostList({
  rows = 3,
  leading = "circle",
  trailingPill = true,
  className,
}: GhostListProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none w-full max-w-sm select-none divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card/40 px-4",
        className,
      )}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3.5">
          {leading !== "none" && (
            <div
              className={cn(
                "size-8 shrink-0 bg-muted",
                leading === "circle" ? "rounded-full" : "rounded-lg",
              )}
            />
          )}
          <div className="flex-1 space-y-2">
            <div
              className={cn(
                "h-2.5 rounded-full bg-muted",
                LINE_WIDTHS[i % LINE_WIDTHS.length],
              )}
            />
            <div
              className={cn(
                "h-2 rounded-full bg-muted/55",
                SUBLINE_WIDTHS[i % SUBLINE_WIDTHS.length],
              )}
            />
          </div>
          {trailingPill && (
            <div className="h-5 w-14 shrink-0 rounded-full bg-muted/70" />
          )}
        </div>
      ))}
    </div>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  icon: PhosphorIcon;
  title: string;
  description: React.ReactNode;
  /** Primary CTA (and optionally secondary) — rendered below the description. */
  action?: React.ReactNode;
  /** Faint ghost of the populated surface, shown above the header. */
  preview?: React.ReactNode;
  /** Wrap in a dashed-border card (for empties that sit inside a panel). */
  bordered?: boolean;
  /**
   * "center" — a first-run state that owns the whole region (the default).
   * "start"  — an empty inside a panel or section, where centring would fight
   *            the surrounding left-aligned content.
   */
  align?: "center" | "start";
  className?: string;
  style?: React.CSSProperties;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  preview,
  bordered = false,
  align = "center",
  className,
  style,
}: EmptyStateProps) {
  const centered = align === "center";
  return (
    <div
      style={style}
      className={cn(
        "animate-fade-up relative isolate flex flex-1 flex-col",
        centered
          ? "items-center justify-center px-6 py-16 text-center"
          : // Fieldset variant: it sits under a section header that already
            // carries padding — py-10 here read as a hole in the page.
            "items-start px-1 py-4 text-left",
        bordered && "rounded-xl border border-dashed border-border",
        className,
      )}
    >
      {/* Dot-paper workbench: the texture marks where artifacts will sit.
          Masked so it breathes under the content instead of filling the page. */}
      {centered && (
        <div
          aria-hidden
          className="bg-dot-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_45%,black,transparent)]"
        />
      )}
      {preview && (
        <div
          className={cn(
            "mb-8 flex w-full opacity-[0.6]",
            centered ? "justify-center" : "justify-start",
          )}
        >
          {preview}
        </div>
      )}

      <span className="flex size-10 items-center justify-center rounded-xl bg-brand/12 text-brand">
        <Icon className="size-5" weight="bold" aria-hidden />
      </span>

      <h2 className="mt-4 font-heading text-base font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p
        className={cn(
          "mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground",
          centered && "mx-auto",
        )}
      >
        {description}
      </p>

      {action && (
        <div
          className={cn(
            "mt-5 flex flex-wrap items-center gap-2.5",
            centered && "justify-center",
          )}
        >
          {action}
        </div>
      )}
    </div>
  );
}

// ── NoResults ────────────────────────────────────────────────────────────────
//
// The quiet counterpart: data exists, the current filter/search just matched
// nothing. No preview, no big icon — just orient the user and offer a way back.

export interface NoResultsProps {
  title: string;
  description?: React.ReactNode;
  /** Optional "clear" affordance (button/link). */
  action?: React.ReactNode;
  className?: string;
}

export function NoResults({
  title,
  description,
  action,
  className,
}: NoResultsProps) {
  return (
    <div
      className={cn(
        "animate-fade-up flex flex-col items-center justify-center gap-2 px-6 py-16 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ── ErrorState ───────────────────────────────────────────────────────────────
//
// The surface a region shows when its data did not arrive. It is deliberately
// NOT an empty state: "No responses yet" after a 500 is a lie, and it is the
// single most common data-state defect. Copy rules, all enforced here:
//
//   • name the resource — "Couldn't load responses", never "Something went wrong"
//   • "Couldn't" for user-state, "Failed to" for infrastructure
//   • no HTTP codes, no stack traces, no infra internals in user copy
//   • always end with a next step
//   • never auto-retry, and never offer retry on a permanent failure
//   • a correlation reference only for *system* failures, and collapsed

export type ErrorStateVariant = "error" | "forbidden" | "not-found";

export interface ErrorStateProps {
  /**
   * What failed, as a lowercase noun phrase that reads inside a sentence:
   * "responses", "this form", "your billing history".
   */
  resource: string;
  variant?: ErrorStateVariant;
  /**
   * Retry handler. Ignored for `forbidden` / `not-found` — retrying a
   * permanent failure is the P4 defect (offering an action that cannot succeed).
   */
  onRetry?: () => void;
  /** Support correlation id. Only rendered for `error`, and always collapsed. */
  reference?: string | null;
  /** Escape hatch beside the retry button (e.g. a link back to the list). */
  action?: React.ReactNode;
  /** Drop the large icon and padding, for errors that replace one small panel. */
  compact?: boolean;
  align?: "center" | "start";
  className?: string;
}

const ERROR_COPY: Record<
  ErrorStateVariant,
  {
    icon: PhosphorIcon;
    title: (resource: string) => string;
    description: string;
    retryable: boolean;
    tone: string;
  }
> = {
  error: {
    icon: WarningOctagon,
    title: (r) => `Couldn't load ${r}`,
    description:
      "The request didn't complete. Nothing was changed — try again, and if it keeps failing, contact support with the reference below.",
    retryable: true,
    tone: "bg-destructive/10 text-destructive",
  },
  forbidden: {
    icon: LockKey,
    title: (r) => `You don't have access to ${r}`,
    description:
      "Your role on this project doesn't include this view. A project owner or admin can grant you access.",
    retryable: false,
    tone: "bg-muted text-muted-foreground",
  },
  "not-found": {
    icon: MagnifyingGlass,
    title: (r) => `Couldn't find ${r}`,
    description:
      "It may have been deleted, renamed, or moved to another project. Head back and pick it from the list.",
    retryable: false,
    tone: "bg-muted text-muted-foreground",
  },
};

export function ErrorState({
  resource,
  variant = "error",
  onRetry,
  reference,
  action,
  compact = false,
  align = "center",
  className,
}: ErrorStateProps) {
  const copy = ERROR_COPY[variant];
  const Icon = copy.icon;
  const centered = align === "center";
  const showRetry = copy.retryable && !!onRetry;

  return (
    <div
      role="alert"
      className={cn(
        "animate-fade-up flex flex-col",
        centered ? "items-center text-center" : "items-start text-left",
        compact ? "gap-2 px-4 py-8" : "flex-1 justify-center gap-0 px-6 py-16",
        className,
      )}
    >
      {!compact && (
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-xl",
            copy.tone,
          )}
        >
          <Icon className="size-5" weight="bold" aria-hidden />
        </span>
      )}

      <h2
        className={cn(
          "font-semibold tracking-tight text-foreground",
          compact ? "text-sm" : "mt-4 font-heading text-base",
        )}
      >
        {copy.title(resource)}
      </h2>
      <p
        className={cn(
          "max-w-sm text-xs leading-relaxed text-muted-foreground",
          compact ? "" : "mt-1.5",
          centered && "mx-auto",
        )}
      >
        {copy.description}
      </p>

      {(showRetry || action) && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2.5",
            compact ? "mt-1" : "mt-5",
            centered && "justify-center",
          )}
        >
          {showRetry && (
            <Button
              size="sm"
              variant={compact ? "outline" : "default"}
              onClick={onRetry}
              className="gap-1.5 text-xs"
            >
              <ArrowClockwise className="size-3.5" weight="bold" aria-hidden />
              Try again
            </Button>
          )}
          {action}
        </div>
      )}

      {variant === "error" && reference && (
        <details className={cn("group/ref", compact ? "mt-1" : "mt-4")}>
          <summary className="cursor-pointer list-none text-[11px] text-muted-foreground/70 underline-offset-2 hover:underline">
            Reference for support
          </summary>
          <code className="mt-1 block select-all font-mono text-[11px] text-muted-foreground/70">
            {reference}
          </code>
        </details>
      )}
    </div>
  );
}
