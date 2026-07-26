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
import { type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

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
  className,
  style,
}: EmptyStateProps) {
  return (
    <div
      style={style}
      className={cn(
        "animate-fade-up flex flex-1 flex-col items-center justify-center px-6 py-16 text-center",
        bordered && "rounded-xl border border-dashed border-border",
        className,
      )}
    >
      {preview && (
        <div className="mb-8 flex w-full justify-center opacity-[0.6]">
          {preview}
        </div>
      )}

      <span className="flex size-10 items-center justify-center rounded-xl bg-brand/12 text-brand">
        <Icon className="size-5" weight="bold" aria-hidden />
      </span>

      <h2 className="mt-4 font-heading text-base font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>

      {action && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
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
