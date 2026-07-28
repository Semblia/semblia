"use client";

/**
 * DataState — the single owner of "what does this region show right now?".
 *
 * Every data surface in the app used to hand-write its own ladder:
 *
 *     loading ? <Skeleton/> : items.length === 0 ? <Empty/> : <Rows/>
 *
 * That shape has a hole in it that four separate surfaces fell through: when
 * the query *fails*, `items` is empty, so the user is told "No responses yet"
 * after a 500. The fix is not four patches — it is removing the page's ability
 * to express it. `useDataState` derives the state from the query result, error
 * first, so `empty` while `isError` cannot be constructed at a call site.
 *
 * Contract:
 *   • error outranks empty, always
 *   • first-run empty and filtered empty are different surfaces
 *   • a failure *over already-rendered data* keeps the data and says so inline,
 *     rather than throwing the user's rows away (the "partial" state)
 *   • permission and not-found failures never offer a retry that must fail
 *   • nothing indicates loading below 200ms
 */

import * as React from "react";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import type { UseQueryResult } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import { ErrorState } from "./empty-state";

// ── State union ──────────────────────────────────────────────────────────────

export type DataStateKind =
  | "loading-initial"
  | "empty-first-run"
  | "empty-filtered"
  | "error"
  | "forbidden"
  | "not-found"
  | "ready";

export interface DataStateResult {
  kind: DataStateKind;
  /** A refresh is running over data that is already on screen. */
  isRefreshing: boolean;
  /** The refresh failed, but the previously loaded data is still valid. */
  hasRefreshError: boolean;
  /** HTTP status when the failure came from the API; null otherwise. */
  status: number | null;
  /** Correlation id safe to show a user (system failures only). */
  reference: string | null;
  retry: () => void;
}

/** The slice of a react-query result `useDataState` actually reads. */
type QueryLike<TData> = Pick<
  UseQueryResult<TData, unknown>,
  | "data"
  | "dataUpdatedAt"
  | "error"
  | "isError"
  | "isFetching"
  | "isPending"
  | "isRefetching"
  | "refetch"
>;

export interface UseDataStateOptions {
  /**
   * How many records the surface is about to render. Drives empty vs ready.
   * Omit for non-collection surfaces (a single record, a settings panel) —
   * presence of `data` is then the only signal.
   */
  count?: number;
  /**
   * True when a filter, search, or tab is narrowing the query. Selects
   * `empty-filtered` over `empty-first-run`, which are different surfaces with
   * different copy and different recovery actions.
   */
  filtered?: boolean;
  /**
   * Treat cached data from before this component mounted as not-yet-ready
   * while a fresh fetch is in flight.
   */
  requireFreshOnMount?: boolean;
}

function classify(error: unknown): {
  kind: Extract<DataStateKind, "error" | "forbidden" | "not-found">;
  status: number | null;
} {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return { kind: "forbidden", status: error.status };
    }
    if (error.status === 404) return { kind: "not-found", status: 404 };
    return { kind: "error", status: error.status };
  }
  return { kind: "error", status: null };
}

/**
 * A short, non-sensitive correlation id. `ApiError.message` carries the raw
 * response body, which can hold internals — so only a digest of it is ever
 * shown, never the body itself.
 */
function referenceFor(error: unknown, status: number | null): string | null {
  if (status === null) return null;
  const stamp = Math.abs(hash(String(status) + describeError(error)))
    .toString(36)
    .slice(0, 8)
    .toUpperCase();
  return `${status}-${stamp}`;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return h;
}

export function useDataState<TData>(
  query: QueryLike<TData>,
  options: UseDataStateOptions = {},
): DataStateResult {
  const { count, filtered = false, requireFreshOnMount = false } = options;
  const [mountedAt] = React.useState(() => Date.now());

  const hasData = query.data !== undefined;
  const staleOnMount =
    requireFreshOnMount && hasData && query.dataUpdatedAt < mountedAt;

  const retry = React.useCallback(() => {
    void query.refetch();
  }, [query]);

  // Error first. This ordering is the whole point of the primitive: no branch
  // below can be reached while the query is failing without cached data.
  if (query.isError && !hasData) {
    const { kind, status } = classify(query.error);
    return {
      kind,
      isRefreshing: false,
      hasRefreshError: false,
      status,
      reference: referenceFor(query.error, status),
      retry,
    };
  }

  if (!hasData || (staleOnMount && query.isFetching)) {
    return {
      kind: query.isError ? "error" : "loading-initial",
      isRefreshing: false,
      hasRefreshError: false,
      status: null,
      reference: null,
      retry,
    };
  }

  const isEmpty = count !== undefined && count === 0;
  const kind: DataStateKind = isEmpty
    ? filtered
      ? "empty-filtered"
      : "empty-first-run"
    : "ready";

  return {
    kind,
    isRefreshing: query.isRefetching && !query.isError,
    hasRefreshError: query.isError,
    status: null,
    reference: null,
    retry,
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export interface DataStateProps {
  state: DataStateResult;
  /**
   * What is being loaded, as a lowercase noun phrase used in error copy:
   * "responses", "your webhooks", "this form".
   */
  resource: string;
  /**
   * Cold-load placeholder. Must match the final layout's dimensions so the
   * swap causes no shift — a skeleton is never an empty state and never wraps
   * a focusable element.
   */
  skeleton: React.ReactNode;
  /** First-run surface: the user has genuinely never had one of these. */
  empty?: React.ReactNode;
  /** Filtered/searched surface. Falls back to `empty` when not supplied. */
  filteredEmpty?: React.ReactNode;
  /** Replace the default error surface entirely. */
  errorSurface?: React.ReactNode;
  /** Escape-hatch action rendered beside "Try again" on the error surface. */
  errorAction?: React.ReactNode;
  /** Render errors compactly, for a state that replaces one panel in a grid. */
  compactError?: boolean;
  align?: "center" | "start";
  className?: string;
  children: React.ReactNode;
}

export function DataState({
  state,
  resource,
  skeleton,
  empty,
  filteredEmpty,
  errorSurface,
  errorAction,
  compactError = false,
  align = "center",
  className,
  children,
}: DataStateProps) {
  const body = (() => {
    switch (state.kind) {
      case "loading-initial":
        return skeleton;

      case "error":
      case "forbidden":
      case "not-found":
        return (
          errorSurface ?? (
            <ErrorState
              resource={resource}
              variant={state.kind}
              onRetry={state.retry}
              reference={state.reference}
              action={errorAction}
              compact={compactError}
              align={align}
            />
          )
        );

      case "empty-filtered":
        return filteredEmpty ?? empty ?? null;

      case "empty-first-run":
        return empty ?? null;

      default:
        return children;
    }
  })();

  return (
    <div
      className={cn("flex flex-1 flex-col", className)}
      aria-busy={state.kind === "loading-initial" || state.isRefreshing}
    >
      {state.hasRefreshError && <RefreshErrorNotice onRetry={state.retry} />}
      {body}
    </div>
  );
}

// ── Partial state ────────────────────────────────────────────────────────────
//
// A refresh failed but the rows on screen are still real. Throwing them away
// for an error page would be a worse lie than keeping them — so keep them, and
// say plainly that what is shown may be behind.

function RefreshErrorNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2 text-xs text-muted-foreground sm:px-6"
    >
      <WarningCircle
        className="size-3.5 shrink-0 text-destructive"
        weight="bold"
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        Couldn&apos;t refresh — showing the last loaded data.
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-foreground transition-colors hover:bg-muted focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <ArrowClockwise className="size-3" weight="bold" aria-hidden />
        Try again
      </button>
    </div>
  );
}
