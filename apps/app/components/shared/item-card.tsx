"use client";

/**
 * ItemCard — slot-based card item built on ItemShell.
 *
 * Adds `h-full flex flex-col` so the card fills its grid cell and all items
 * in a row reach equal height — fixes the short-card bug in widget grid.
 *
 * Supports two usage modes:
 *
 * 1. Structured (preview + body + footer slots):
 *    <ItemCard preview={<MinPreview />} footer={<Actions />}>
 *      {body content}
 *    </ItemCard>
 *    Body gets flex-1 so it fills available space; footer pins to bottom.
 *
 * 2. Flexible (all children):
 *    <ItemCard>{...everything}</ItemCard>
 *    Caller manages internal layout. Shell still provides h-full.
 */

import { cn } from "@/lib/utils";
import { ItemShell, type ItemShellProps } from "./item-shell";

export interface ItemCardProps extends Omit<ItemShellProps, "shape"> {
  /**
   * Optional top-zone slot (e.g. mini-preview, hero image).
   * Rendered above the body — not flex-1, preserves intrinsic height.
   */
  preview?: React.ReactNode;
  /**
   * Optional bottom-zone slot (e.g. action row, stat bar).
   * Pinned to the bottom of the card via `mt-auto`.
   * Only rendered when using the structured (preview/footer) mode.
   */
  footer?: React.ReactNode;
}

export function ItemCard({
  preview,
  footer,
  children,
  className,
  ...shellProps
}: ItemCardProps) {
  const structured = preview != null || footer != null;

  return (
    <ItemShell shape="card" className={cn("h-full", className)} {...shellProps}>
      {structured ? (
        <>
          {preview}
          {/* Body grows to fill remaining height */}
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          {/* Footer pins to bottom */}
          {footer != null && <div className="mt-auto">{footer}</div>}
        </>
      ) : (
        children
      )}
    </ItemShell>
  );
}
