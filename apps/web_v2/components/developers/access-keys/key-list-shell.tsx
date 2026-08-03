"use client";

/**
 * The chrome both key lists sit in.
 *
 * The two pages this replaces each owned a hand-written ladder —
 * `loading ? skeletons : keys.length === 0 ? <Empty/> : matches.length === 0 ?
 * <p>no match</p> : <Rows/>` — which meant a failed request rendered "No API
 * keys", inviting the owner to mint a duplicate of a key they already have.
 * `useDataState` owns the ladder here, so that state cannot be expressed.
 *
 * The other two fixes: the toolbar no longer unmounts itself while the query it
 * scopes is running, and the header carries state rather than an explanation.
 */

import * as React from "react";
import type { V2ApiKeyDTO } from "@workspace/types";
import { fmtCount } from "@/lib/format";
import {
  DataState,
  FilterPills,
  HeaderSep,
  ListSkeleton,
  PageBody,
  PageHeader,
  RefreshingDataBadge,
  SearchField,
  type DataStateResult,
} from "@/components/shared";
import {
  countKeys,
  describeKeys,
  filterKeys,
  type DescribedKey,
  type KeyStatusCounts,
  type KeyStatusFilter,
} from "./key-model";
import { useNow } from "./use-now";

// ── List state ───────────────────────────────────────────────────────────────

export interface KeyListState {
  search: string;
  setSearch: (value: string) => void;
  status: KeyStatusFilter;
  setStatus: (value: KeyStatusFilter) => void;
  counts: KeyStatusCounts;
  /** Every key, with its lifecycle already derived from one clock reading. */
  rows: DescribedKey[];
  /** What the current search + status filter leaves. */
  visible: DescribedKey[];
  isFiltered: boolean;
  clear: () => void;
}

/**
 * Search and status live in component state rather than the URL. Nothing links
 * into "the revoked keys of project X" — these surfaces are only ever entered
 * from the developer nav — so the round trip would buy no shareable state and
 * cost a router write per keystroke.
 */
export function useKeyList(entries: V2ApiKeyDTO[]): KeyListState {
  const now = useNow();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<KeyStatusFilter>("all");

  const rows = React.useMemo(() => describeKeys(entries, now), [entries, now]);
  const counts = React.useMemo(() => countKeys(rows), [rows]);
  const visible = React.useMemo(
    () => filterKeys(rows, status, search),
    [rows, status, search],
  );

  const clear = React.useCallback(() => {
    setSearch("");
    setStatus("all");
  }, []);

  return {
    search,
    setSearch,
    status,
    setStatus,
    counts,
    rows,
    visible,
    isFiltered: status !== "all" || search.trim().length > 0,
    clear,
  };
}

// ── Shell ────────────────────────────────────────────────────────────────────

export interface KeyListShellProps {
  title: string;
  /** Lowercase noun phrase used in error copy: "API keys", "agent keys". */
  resource: string;
  state: DataStateResult;
  list: KeyListState;
  /** Page-scoped create control. Hidden on first run — the empty state owns it. */
  actions?: React.ReactNode;
  searchPlaceholder: string;
  /** Extra toolbar controls (e.g. a kind filter) rendered beside the status pills. */
  toolbarExtra?: React.ReactNode;
  empty: React.ReactNode;
  filteredEmpty: React.ReactNode;
  children: React.ReactNode;
}

const DEGRADED: ReadonlySet<DataStateResult["kind"]> = new Set([
  "error",
  "forbidden",
  "not-found",
]);

/** True only on a genuine first run: the query settled empty with no filter narrowing it. */
function isFirstRun(state: DataStateResult, list: KeyListState): boolean {
  return state.kind === "empty-first-run" && !list.isFiltered;
}

function keyCountSummary(counts: KeyStatusCounts): React.ReactNode {
  return (
    <>
      {fmtCount(counts.all)} {counts.all === 1 ? "key" : "keys"}
      <HeaderSep />
      {fmtCount(counts.active)} active
    </>
  );
}

export function KeyListShell({
  title,
  resource,
  state,
  list,
  actions,
  searchPlaceholder,
  toolbarExtra,
  empty,
  filteredEmpty,
  children,
}: KeyListShellProps) {
  const loading = state.kind === "loading-initial";
  const degraded = DEGRADED.has(state.kind);
  const firstRun = isFirstRun(state, list);

  // The control that scopes the query must not vanish while the query runs, so
  // the toolbar goes only when there is genuinely nothing for it to scope.
  const showToolbar = !degraded && !firstRun;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={title}
        description={
          loading || degraded || list.counts.all === 0
            ? undefined
            : keyCountSummary(list.counts)
        }
        actions={
          firstRun || degraded ? undefined : (
            <>
              <RefreshingDataBadge show={state.isRefreshing} />
              {actions}
            </>
          )
        }
        toolbar={
          showToolbar ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {toolbarExtra}
                <FilterPills
                  options={[
                    {
                      id: "all",
                      label: "All",
                      count: statCount(loading, list.counts.all),
                    },
                    {
                      id: "active",
                      label: "Active",
                      count: statCount(loading, list.counts.active),
                    },
                    {
                      id: "expired",
                      label: "Expired",
                      count: statCount(loading, list.counts.expired),
                    },
                    {
                      id: "revoked",
                      label: "Revoked",
                      count: statCount(loading, list.counts.revoked),
                    },
                  ]}
                  value={list.status}
                  onChange={list.setStatus}
                  size="sm"
                  aria-label="Filter by status"
                />
              </div>
              <SearchField
                value={list.search}
                onChange={list.setSearch}
                placeholder={searchPlaceholder}
                ariaLabel={searchPlaceholder}
                width="fixed"
              />
            </div>
          ) : undefined
        }
      />

      {/* No inner padding rail: lists inside run full-bleed so their hairlines
          reach the viewport edges; rows and section headings own the gutter. */}
      <PageBody padding="bare" className="min-h-0 overflow-y-auto pb-8">
        <DataState
          state={state}
          resource={resource}
          skeleton={
            <ListSkeleton rows={4} leading="square" trailing density="dense" />
          }
          empty={empty}
          filteredEmpty={filteredEmpty}
        >
          {children}
        </DataState>
      </PageBody>
    </div>
  );
}

/** A count of zero is only honest once the count is known. */
function statCount(loading: boolean, value: number): number | null {
  return loading ? null : value;
}
