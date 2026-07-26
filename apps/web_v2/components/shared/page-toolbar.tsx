"use client";

/**
 * PageToolbar — sticky toolbar that sits below the page header.
 *
 * Used for filter / search / sort / bulk actions affordances. Matches the
 * sticky-blur style established by `ProjectsToolbar` and the testimonials
 * filter bar — uniformly applied here so toolbars across the app feel
 * identical regardless of which page they sit on.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageToolbarProps {
  /** Left cluster (typically search + primary filters). */
  leading?: React.ReactNode;
  /** Right cluster (typically sort + view toggle + result count). */
  trailing?: React.ReactNode;
  /** Optional second row, useful for stacked filters on narrow widths. */
  secondary?: React.ReactNode;
  /**
   * Sticky offset inside the scrolling content column. Defaults to 0 — pass a
   * value only when a header sits above and the toolbar must clear it.
   */
  stickyTop?: string;
  /** Skip the bottom border (useful when toolbar abuts another bordered region). */
  borderless?: boolean;
  className?: string;
}

export function PageToolbar({
  leading,
  trailing,
  secondary,
  stickyTop = "0px",
  borderless = false,
  className,
}: PageToolbarProps) {
  return (
    <div
      className={cn(
        "sticky z-10 bg-background px-4 py-2.5 sm:px-6",
        !borderless && "border-b border-border",
        className,
      )}
      style={{ top: stickyTop }}
    >
      <div className="flex flex-wrap items-center gap-3">
        {leading && (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {leading}
          </div>
        )}
        {trailing && (
          <div className="flex shrink-0 items-center gap-2">{trailing}</div>
        )}
      </div>
      {secondary && (
        <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-border/60 pt-2.5">
          {secondary}
        </div>
      )}
    </div>
  );
}
