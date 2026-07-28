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
  /** Add pb-24 to prevent sticky SettingsFooter from overlapping content. */
  withFooter?: boolean;
  /**
   * Bound the body's line length. Use on form surfaces — settings and account.
   *
   * A settings page is a form, and a form has a measure. Stretched across the
   * full ~1,150px of a desktop content column, a member row put its role select
   * 800px from the name it belonged to and an email field ran to 850px; the
   * label and its control stopped reading as one thing.
   *
   * This is not the centred page rail that was retired in 2026-06-13. The body
   * stays left-aligned and the page chrome stays full-bleed — only the form's
   * own width is bounded, and it is set here rather than per section so one
   * page never renders two different measures.
   */
  measure?: boolean;
}

export function PageBody({
  padding = "default",
  stack = false,
  withFooter = false,
  measure = false,
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
        withFooter && "pb-24",
        measure && "max-w-5xl",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
