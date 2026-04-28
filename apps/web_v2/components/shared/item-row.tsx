"use client";

/**
 * ItemRow — slot-based row item built on ItemShell.
 *
 * Provides the standard responsive layout for list rows:
 *   • title+subtitle block (flex-1, min-w-0 truncation context)
 *   • metrics slot: beside title on sm+, wraps below on mobile — no shrink-0
 *   • leading/trailing side slots (shrink-0)
 *   • actions row below the main line
 *
 * Fixes the mobile metric-overlap bug that appeared when a shrink-0 metric
 * block competed with a flex-1 title for horizontal space.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ItemShell, type ItemShellProps } from "./item-shell";

export interface ItemRowProps
  extends Omit<ItemShellProps, "shape" | "children"> {
  /** Left-edge zone (avatar, icon, checkbox). Always shrink-0. */
  leading?: React.ReactNode;
  /** Primary label. Gets min-w-0 + truncation context. Required. */
  title: React.ReactNode;
  /** Secondary line below the title. */
  subtitle?: React.ReactNode;
  /**
   * Metric chips. On sm+ they sit to the right of the title (baseline-aligned).
   * On mobile they wrap below the title. No shrink-0 applied — wraps freely.
   */
  metrics?: React.ReactNode;
  /** Far-right zone (arrow, status icon, badge). Always shrink-0. */
  trailing?: React.ReactNode;
  /** Full-width row rendered below the main line (typically ItemActionRow). */
  actions?: React.ReactNode;
  /** Inner content padding. Call sites override via className on the row. */
  padding?: "default" | "comfortable" | "dense";
}

const PADDING: Record<NonNullable<ItemRowProps["padding"]>, string> = {
  default: "px-6 py-4",
  comfortable: "py-5 pl-6 pr-6",
  dense: "px-4 py-3",
};

export function ItemRow({
  leading,
  title,
  subtitle,
  metrics,
  trailing,
  actions,
  padding = "default",
  className,
  ...shellProps
}: ItemRowProps) {
  return (
    <ItemShell
      shape="row"
      className={cn("flex-col", PADDING[padding], className)}
      {...shellProps}
    >
      {/* Main horizontal line */}
      <div className="flex w-full items-center gap-3">
        {leading != null && <div className="shrink-0">{leading}</div>}

        {/* Title block + metrics — responsive stack */}
        <div
          className={cn(
            "flex min-w-0 flex-1",
            metrics != null
              ? "flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-6"
              : "flex-col",
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="min-w-0">{title}</div>
            {subtitle != null && (
              <div className="mt-0.5 min-w-0">{subtitle}</div>
            )}
          </div>

          {metrics != null && (
            <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
              {metrics}
            </div>
          )}
        </div>

        {trailing != null && <div className="shrink-0">{trailing}</div>}
      </div>

      {/* Actions row */}
      {actions != null && <div className="mt-3 w-full">{actions}</div>}
    </ItemShell>
  );
}
