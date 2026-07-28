"use client";

/**
 * AnalyticsPanel — a titled region of the dashboard that owns its own states.
 *
 * The old dashboard drew twenty copies of `rounded-lg border border-border
 * bg-card p-5` and ten copies of the same `h3` + subtitle, so twelve unrelated
 * facts arrived as twelve equal-weight boxes with no hierarchy between them.
 * Analytics panels are not one of the three sanctioned containers: they sit on
 * the page background and group with a heading and a hairline, which is exactly
 * what `Section` does.
 *
 * The second half of the job is the state matrix. Every panel used to inherit a
 * single `if (!data)` gate on the whole page, so a failed fetch left the user
 * shimmering forever and a project with no data got a fully-formed chart of
 * zeroes. Each panel now renders through `DataState`, which makes "empty while
 * the query failed" impossible to express.
 */

import * as React from "react";
import { DataState, Section, type DataStateResult } from "@/components/shared";

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
  /** Hairline above the heading, separating it from the section before. */
  divided?: boolean;
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
  divided = false,
  id,
  children,
}: AnalyticsPanelProps) {
  return (
    <Section
      title={title}
      description={description}
      meta={meta}
      actions={actions}
      divided={divided}
      id={id}
    >
      <DataState
        state={state}
        resource={resource}
        align="start"
        // A panel that fails while its siblings succeed replaces only itself,
        // so the failure reads at the size of what was lost.
        compactError
        skeleton={skeleton}
        empty={empty}
        filteredEmpty={filteredEmpty}
      >
        {children}
      </DataState>
    </Section>
  );
}
