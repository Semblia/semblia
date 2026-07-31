"use client";

/**
 * AnalyticsPanel — one instrument on the dashboard, owning its own states.
 *
 * A bounded paper card, deliberately: the unbordered Section treatment left
 * this page "overwhelmingly flat" — a chart, a funnel, and a heatmap all
 * floating on the desk with nothing holding each reading together. A
 * dashboard panel is a grid tile where the tile *is* the entity (the
 * instrument), one of the sanctioned bordered containers. Panels sit as
 * peers in the tab's two-column instrument grid; `wide` spans both columns
 * for tables and other width-hungry content. Nothing inside a panel draws a
 * second surface.
 *
 * The second half of the job is the state matrix. Every panel used to inherit
 * a single `if (!data)` gate on the whole page, so a failed fetch left the
 * user shimmering forever and a project with no data got a fully-formed chart
 * of zeroes. Each panel renders through `DataState`, which makes "empty while
 * the query failed" impossible to express.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { DataState, type DataStateResult } from "@/components/shared";

/**
 * A panel's state, derived from the state of the query that feeds it.
 *
 * Error still outranks empty: a failure kind passes straight through, so a
 * panel can never be talked into rendering "No data yet" over a 500. Only when
 * the base state is genuinely `ready` does the panel's own row count decide
 * between first-run empty, filtered empty, and content.
 *
 * `hasRefreshError` is deliberately dropped. The notice belongs to the page
 * once, not to each of a dozen panels that share one payload.
 */
export function derivePanelState(
  base: DataStateResult,
  { count, filtered = false }: { count: number; filtered?: boolean },
): DataStateResult {
  if (base.kind !== "ready") {
    return { ...base, hasRefreshError: false };
  }
  return {
    ...base,
    kind:
      count === 0 ? (filtered ? "empty-filtered" : "empty-first-run") : "ready",
    hasRefreshError: false,
  };
}

export interface AnalyticsPanelProps {
  title: React.ReactNode;
  /** The sentence that earns the panel its place. Never a restatement of the title. */
  description?: React.ReactNode;
  /** Inline state beside the title — a count, a threshold, a cap. */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  state: DataStateResult;
  /** Lowercase noun phrase used in the panel's error copy. */
  resource: string;
  /** Cold-load placeholder shaped like this panel's real content. */
  skeleton: React.ReactNode;
  empty: React.ReactNode;
  filteredEmpty?: React.ReactNode;
  /** Span both columns of the tab's instrument grid (tables, heatmaps). */
  wide?: boolean;
  id?: string;
  children: React.ReactNode;
}

export function AnalyticsPanel({
  title,
  description,
  meta,
  actions,
  state,
  resource,
  skeleton,
  empty,
  filteredEmpty,
  wide = false,
  id,
  children,
}: AnalyticsPanelProps) {
  const headingId = id ? `${id}-heading` : undefined;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "min-w-0 rounded-xl border border-border bg-card",
        wide && "lg:col-span-2",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border/60 px-4 py-3.5 sm:px-5">
        <div className="min-w-0 space-y-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h2
              id={headingId}
              className="min-w-0 text-sm font-semibold tracking-tight text-foreground"
            >
              {title}
            </h2>
            {meta && (
              <span className="text-xs font-normal tabular-nums text-muted-foreground">
                {meta}
              </span>
            )}
          </div>
          {description && (
            <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </header>

      <div className="px-4 py-4 sm:px-5">
        <DataState
          state={state}
          resource={resource}
          align="start"
          // A panel that fails while its siblings succeed replaces only
          // itself, so the failure reads at the size of what was lost.
          compactError
          skeleton={skeleton}
          empty={empty}
          filteredEmpty={filteredEmpty}
        >
          {children}
        </DataState>
      </div>
    </section>
  );
}
