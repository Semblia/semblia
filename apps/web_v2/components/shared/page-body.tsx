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
export type PageBodyMaxWidth = "4xl" | "5xl" | "6xl";

export interface PageBodyProps extends React.ComponentProps<"div"> {
  padding?: PageBodyPadding;
  /** Apply vertical spacing between direct children (space-y-6). */
  stack?: boolean;
  /** Add pb-24 to prevent sticky SettingsFooter from overlapping content. */
  withFooter?: boolean;
  /** Center content on the same 1152px rail used by contained PageHeader. */
  contained?: boolean;
  /** Override the centered rail width for narrower form/detail pages. */
  maxWidth?: PageBodyMaxWidth;
  /** Classes for the centered rail when `contained` is true. */
  contentClassName?: string;
}

const maxWidthClass: Record<PageBodyMaxWidth, string> = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
};

export function PageBody({
  padding = "default",
  stack = false,
  withFooter = false,
  contained = false,
  maxWidth = "6xl",
  contentClassName,
  className,
  children,
  ...rest
}: PageBodyProps) {
  if (contained) {
    return (
      <div
        className={cn(
          "min-w-0 flex-1",
          padding === "default" && "px-4 py-6 sm:px-6 sm:py-8",
          padding === "compact" && "px-4 py-5 sm:px-6",
          // padding === "bare" -> nothing
          withFooter && "pb-24",
          className,
        )}
        {...rest}
      >
        <div
          className={cn(
            "mx-auto w-full",
            maxWidthClass[maxWidth],
            stack && "space-y-6",
            contentClassName,
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-w-0 flex-1",
        padding === "default" && "px-4 py-6 sm:px-6 sm:py-8",
        padding === "compact" && "px-4 py-5 sm:px-6",
        // padding === "bare" → nothing
        stack && "space-y-6",
        withFooter && "pb-24",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
