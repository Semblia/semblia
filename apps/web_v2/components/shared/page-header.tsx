"use client";

/**
 * PageHeader — the canonical two-line hybrid header for every top-level page.
 *
 * Replaces five divergent header patterns:
 *   • Projects:        text-2xl + no border (toolbar provides it)
 *   • Settings/API:    text-2xl + border-b (ProjectPageShell)
 *   • Analytics:       text-2xl + tabs nav inside header
 *   • Widgets:         text-2xl + filter pills + mono caption
 *   • Testimonials:    text-sm in h-14 compact bar
 *   • Collect/Forms:   text-[15px] in py-6 sm:py-8 box
 *
 * Canonical shape (default density):
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  Eyebrow (optional, text-[10px] uppercase tracking)         │
 *   │  Title (text-lg / text-xl semibold)             [actions]   │
 *   │  Description (text-xs muted, with inline · separators)      │
 *   │  Toolbar slot (filter pills, tabs, search) ────────────────  │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Compact density (used by master-detail pages like Testimonials):
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  Title (text-sm semibold) · meta inline      [actions]      │
 *   └──────────────────────────────────────────────────────────────┘
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  /** Tiny uppercase eyebrow above the title (optional). */
  eyebrow?: React.ReactNode;
  /** Main page title. */
  title: React.ReactNode;
  /**
   * Inline meta + description for the secondary line.
   * Compose with `<HeaderSep />` between segments for the standard "·" divider.
   */
  description?: React.ReactNode;
  /** Right-aligned action cluster on the title row. */
  actions?: React.ReactNode;
  /**
   * Toolbar slot rendered at the bottom of the header (filter pills, tabs,
   * mono captions, etc.). Sits inside the same border-b box as the header.
   */
  toolbar?: React.ReactNode;
  /**
   * "default"  → editorial spacing (~96 px tall, generous breathing room).
   * "compact"  → 56 px tall single-row variant for split-list pages where
   *              every vertical pixel of list content matters.
   */
  density?: "default" | "compact";
  /** Skip the bottom border (when a sticky toolbar sits below and provides one). */
  borderless?: boolean;
  /** Animate-in on mount. */
  animate?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  toolbar,
  density = "default",
  borderless = false,
  animate = false,
  className,
  children,
}: PageHeaderProps) {
  if (density === "compact") {
    return (
      <header
        className={cn(
          "sticky top-[3.5rem] z-20 flex h-14 shrink-0 items-center gap-4 bg-background/85 px-4 backdrop-blur-md sm:px-6",
          !borderless && "border-b border-border",
          animate && "animate-fade-up",
          className,
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {eyebrow && (
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70 sm:inline">
              {eyebrow}
            </span>
          )}
          <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <span className="min-w-0 truncate text-xs font-normal text-muted-foreground">
              {description}
            </span>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
        {children}
      </header>
    );
  }

  // ── Default: two-line hybrid ──
  return (
    <header
      className={cn(
        "sticky top-[3.5rem] z-20 bg-background/85 px-4 pt-5 backdrop-blur-md sm:px-6 sm:pt-6",
        !borderless && "border-b border-border",
        animate && "animate-fade-up",
        className,
      )}
    >
      <div className="pb-4">
        {eyebrow && (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {title}
          </h1>
          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {toolbar && (
        <div className="-mx-4 flex items-center justify-between gap-3 border-t border-border/60 px-4 py-2.5 sm:-mx-6 sm:px-6">
          {toolbar}
        </div>
      )}
      {children}
    </header>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Inline visual separator for the description line. Use between meta segments:
 *
 *   description={<>2 widgets <HeaderSep /> Launchpad</>}
 */
export function HeaderSep({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("mx-1.5 text-border", className)}>
      ·
    </span>
  );
}

/**
 * Tiny mono uppercase caption — used on the right side of toolbars for
 * status hints like "EDITS AUTO-DEPLOY · NO RE-EMBED NEEDED.".
 */
export function HeaderCaption({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70",
        className,
      )}
    >
      {children}
    </span>
  );
}
