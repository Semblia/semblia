"use client";

/**
 * DataList — the container every list in the app sits in.
 *
 * Deliberately *not* a row renderer: rows stay with the feature that owns the
 * entity (a response row knows things a generic row can't). What was duplicated
 * across `form-list` / `widget-list` / `responses-list` and kept drifting is the
 * machinery around the rows, so that is what this owns:
 *
 *   • list semantics and hairline separation — rows are never individually
 *     wrapped in their own card, which is the list version of cards-on-cards
 *   • skeleton *rows*, matching the real row's height, never an empty body
 *   • the pagination affordance, driven by the API's own total/hasNext, so a
 *     list can no longer silently truncate at page one (the responses defect)
 *
 * Selection, keyboard triage, and bulk actions are opt-in via
 * `useListSelection` + `BulkActionBar` — most lists are find-and-act and would
 * only be made heavier by carrying that machinery.
 */

import * as React from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildPageNumbers } from "@/lib/pagination";
import { fmtRange } from "@/lib/format";
import { PREVIEW_LEADING } from "./item-row";

// ── List container ───────────────────────────────────────────────────────────

export interface DataListProps {
  /** Accessible name for the list. Required — an unlabelled list is a wall. */
  "aria-label": string;
  /** Rows. Rendered inside a hairline-divided list, never as separate cards. */
  children: React.ReactNode;
  /** Pagination state, straight from the API's paginated envelope. */
  pagination?: DataListPagination;
  className?: string;
}

export interface DataListPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Disable the controls while the next page is in flight. */
  busy?: boolean;
}

export function DataList({
  children,
  pagination,
  className,
  ...aria
}: DataListProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div
        role="list"
        aria-label={aria["aria-label"]}
        className="divide-y divide-border"
      >
        {children}
      </div>
      {pagination && pagination.total > 0 && <ListPagination {...pagination} />}
    </div>
  );
}

// ── Pagination ───────────────────────────────────────────────────────────────
//
// Renders whenever there is more than one page. A list that quietly shows page
// one of five with no affordance is worse than one that says so: the user
// believes they have seen everything.

function ListPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  busy = false,
}: DataListPagination) {
  if (totalPages <= 1) return null;
  const pages = buildPageNumbers(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6"
    >
      <p className="text-xs tabular-nums text-muted-foreground">
        {fmtRange(page, pageSize, total)}
      </p>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs"
          disabled={page <= 1 || busy}
          onClick={() => onPageChange(page - 1)}
        >
          <CaretLeft className="size-3" weight="bold" aria-hidden />
          Previous
        </Button>

        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <span
              key={`gap-${i}`}
              aria-hidden
              className="px-1 text-xs text-muted-foreground/60"
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              size="sm"
              variant={p === page ? "secondary" : "ghost"}
              className="h-7 min-w-7 px-2 text-xs tabular-nums"
              aria-current={p === page ? "page" : undefined}
              disabled={busy}
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs"
          disabled={page >= totalPages || busy}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <CaretRight className="size-3" weight="bold" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}

// ── Skeleton rows ────────────────────────────────────────────────────────────

export interface ListSkeletonProps {
  rows?: number;
  /** Match the real row's leading element so the swap causes no shift. */
  leading?: "circle" | "square" | "preview" | "none";
  /** Match a trailing status chip. */
  trailing?: boolean;
  /** Match the real row's vertical padding. */
  density?: "default" | "dense" | "comfortable";
  className?: string;
}

const SKELETON_PADDING = {
  default: "px-4 py-4 sm:px-6",
  dense: "px-4 py-3",
  comfortable: "px-4 py-5 sm:px-6",
} as const;

/** Widths vary so a loading list doesn't read as a printed pattern. */
const TITLE_WIDTHS = ["w-32", "w-44", "w-28", "w-40", "w-36"];
const SUB_WIDTHS = ["w-3/4", "w-2/3", "w-4/5", "w-1/2", "w-3/5"];

export function ListSkeleton({
  rows = 5,
  leading = "circle",
  trailing = true,
  density = "default",
  className,
}: ListSkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn("divide-y divide-border", className)}
      data-slot="list-skeleton"
    >
      {Array.from({ length: rows }).map((_, i) => {
        // A preview-led row is flush (`ItemRow leadingFlush`): the preview owns
        // the row's left edge top to bottom and the padding lives on the
        // content column. The skeleton has to be built the same way or the
        // swap from loading to loaded moves every row.
        const flush = leading === "preview";
        const content = (
          <>
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton
                className={cn(
                  "animate-shimmer h-3.5",
                  TITLE_WIDTHS[i % TITLE_WIDTHS.length],
                )}
              />
              <Skeleton
                className={cn(
                  "animate-shimmer h-2.5",
                  SUB_WIDTHS[i % SUB_WIDTHS.length],
                )}
              />
            </div>
            {trailing && (
              <Skeleton className="animate-shimmer h-5 w-16 shrink-0 rounded-full" />
            )}
          </>
        );

        if (flush) {
          return (
            <div key={i} className="flex items-stretch">
              <Skeleton
                className={cn("animate-shimmer rounded-none", PREVIEW_LEADING)}
              />
              <div
                className={cn(
                  "flex min-w-0 flex-1 flex-col justify-center",
                  SKELETON_PADDING[density],
                )}
              >
                <div className="flex items-center gap-3">{content}</div>
                {/* Preview-led rows all carry an `ItemActionRow` under the main
                    line. Leaving it out here made the skeleton shorter than the
                    row it stands in for, so the list still jumped on load —
                    which is the one thing a skeleton exists to prevent. */}
                <Skeleton className="animate-shimmer mt-3 h-6 w-40 rounded-md" />
              </div>
            </div>
          );
        }

        return (
          <div
            key={i}
            className={cn("flex items-center gap-3", SKELETON_PADDING[density])}
          >
            {leading !== "none" && (
              <Skeleton
                className={cn(
                  "animate-shimmer shrink-0",
                  leading === "circle" && "size-9 rounded-full",
                  leading === "square" && "size-9 rounded-lg",
                )}
              />
            )}
            {content}
          </div>
        );
      })}
    </div>
  );
}

/** Skeleton for a card-grid view, matching the tile's aspect and chrome. */
export function GridSkeleton({
  tiles = 6,
  className,
}: {
  tiles?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {Array.from({ length: tiles }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <Skeleton className="animate-shimmer h-32 w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="animate-shimmer h-3.5 w-32" />
            <Skeleton className="animate-shimmer h-2.5 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
