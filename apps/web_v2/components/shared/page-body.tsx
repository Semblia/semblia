"use client";

/**
 * PageBody — uniform body container for top-level pages.
 *
 * Replaces ad-hoc `flex-1 px-X py-Y` containers across:
 *   • ProjectPageShell    (px-6 py-8)
 *   • AnalyticsDashboard  (px-6 py-6 space-y-6)
 *   • WidgetList          (px-4 py-5 sm:px-6)
 *   • Collect / Forms     (no padding — rows own it)
 *
 * Three padding presets cover the variations:
 *   "default" → px-4 sm:px-6 py-6 sm:py-8 — for editorial pages with sections
 *   "compact" → px-4 sm:px-6 py-5         — for gallery + dashboard pages
 *   "bare"    → no padding                — when child rows own their own
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export type PageBodyPadding = "default" | "compact" | "bare";

export interface PageBodyProps extends React.ComponentProps<"div"> {
  padding?: PageBodyPadding;
  /** Apply vertical spacing between direct children (space-y-6). */
  stack?: boolean;
}

export function PageBody({
  padding = "default",
  stack = false,
  className,
  children,
  ...rest
}: PageBodyProps) {
  return (
    <div
      className={cn(
        "min-w-0 flex-1",
        padding === "default" && "px-4 py-6 sm:px-6 sm:py-8",
        padding === "compact" && "px-4 py-5 sm:px-6",
        // padding === "bare" → nothing
        stack && "space-y-6",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
