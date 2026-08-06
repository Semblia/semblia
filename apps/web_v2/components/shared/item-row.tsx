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

export interface ItemRowProps extends Omit<
  ItemShellProps,
  "shape" | "children"
> {
  /**
   * Rows that contain their own controls must use `onSurfaceClick`, not
   * `onClick` — see the note on {@link ItemShellProps.onSurfaceClick}.
   */
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
  /**
   * Render `leading` flush against the row's edges, spanning its full height,
   * with everything else — main line *and* actions — starting after it.
   *
   * For preview-led rows. A preview boxed inside the row's padding is a fixed
   * rectangle floating in whitespace whose height has nothing to do with the
   * row's, and the action row then starts back at the left edge, underneath it,
   * so the row reads as two unrelated blocks. Flush, the preview *is* the row's
   * left edge and everything about that item lines up in one column beside it.
   */
  leadingFlush?: boolean;
}

// One canonical row inset, aligned with the app chrome gutter (px-4 sm:px-6)
// so full-bleed hairlines and row content share the same left edge everywhere.
const PADDING: Record<NonNullable<ItemRowProps["padding"]>, string> = {
  default: "px-4 py-4 sm:px-6",
  comfortable: "px-4 py-5 sm:px-6",
  dense: "px-4 py-3 sm:px-6",
};

/**
 * Geometry of a flush preview slot ({@link ItemRowProps.leadingFlush}).
 *
 * The one place a preview-led row and the `ListSkeleton leading="preview"`
 * standing in for it agree on the preview's size, so a cold load shifts
 * nothing. Height comes from the row (`self-stretch`); only the width is fixed,
 * and it steps down on narrow screens so the content beside it keeps a
 * readable measure instead of wrapping every metadata line three ways.
 */
export const PREVIEW_LEADING =
  "w-24 shrink-0 self-stretch border-r border-border/70 min-h-24 sm:w-36";

export function ItemRow({
  leading,
  title,
  subtitle,
  metrics,
  trailing,
  actions,
  padding = "default",
  leadingFlush = false,
  className,
  ...shellProps
}: ItemRowProps) {
  // The shell keeps no padding of its own in the flush variant: the leading
  // slot owns the left edge top to bottom, and the padding moves onto the
  // content column so the main line and the action row share one left edge
  // beside it.
  const flush = leadingFlush && leading != null;
  const body = (
    <RowBody
      leading={flush ? undefined : leading}
      title={title}
      subtitle={subtitle}
      metrics={metrics}
      trailing={trailing}
      actions={actions}
    />
  );

  return (
    <ItemShell
      shape="row"
      className={cn(
        flush ? "items-stretch" : cn("flex-col", PADDING[padding]),
        className,
      )}
      {...shellProps}
    >
      {flush ? (
        <>
          {leading}
          <div
            className={cn(
              "flex min-w-0 flex-1 flex-col justify-center",
              PADDING[padding],
            )}
          >
            {body}
          </div>
        </>
      ) : (
        body
      )}
    </ItemShell>
  );
}

/**
 * The row's content, identical in both variants — which is the point: the flush
 * shape changes only where the padding sits and who owns the left edge, never
 * what a row is made of.
 */
function RowBody({
  leading,
  title,
  subtitle,
  metrics,
  trailing,
  actions,
}: Pick<
  ItemRowProps,
  "leading" | "title" | "subtitle" | "metrics" | "trailing" | "actions"
>) {
  return (
    <>
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
    </>
  );
}
