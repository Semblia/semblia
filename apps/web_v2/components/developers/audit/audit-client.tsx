"use client";

/**
 * AuditClient — the project activity log.
 *
 * The log is the record of who changed what, so its failure modes matter more
 * than most. The shared primitives carry the state ladder (`DataState` derives
 * error before empty — an audit log that claims nothing happened because it
 * could not be read is the worst possible lie for this surface) and the
 * pagination affordance (`DataList` renders the API's own total/totalPages).
 *
 * Two things are this page's own:
 *
 *   • bursts — consecutive events by the same actor within minutes collapse
 *     into one expandable block (`clusterAuditEvents`), so a bulk approve or
 *     an import reads as one line of history, not twenty
 *   • scoping — actor kind, member, and time window all filter server-side,
 *     so "what did this person do last week" is a query, not a scroll
 */

import * as React from "react";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import type { V2ActorType } from "@workspace/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PageHeader,
  PageBody,
  PageToolbar,
  FilterPills,
  DataState,
  DataList,
  ListSkeleton,
  EmptyState,
  NoResults,
  GhostList,
  RefreshingDataBadge,
  useDataState,
  type FilterPillOption,
} from "@/components/shared";
import { useProjectActionAudit, useProjectMembers } from "@/hooks/api";
import { fmtCount } from "@/lib/format";
import { clusterAuditEvents } from "./audit-cluster";
import { AuditClusterRow } from "./audit-cluster-row";
import { AuditEventRow } from "./audit-event-item";

const PAGE_SIZE = 25;

type ActorFilter = "all" | V2ActorType;

const FILTERS: FilterPillOption<ActorFilter>[] = [
  { id: "all", label: "All" },
  { id: "user", label: "Users" },
  { id: "api_key", label: "API keys" },
  { id: "agent_key", label: "Agents" },
  { id: "system", label: "System" },
];

type RangeFilter = "all" | "24h" | "7d" | "30d";

const RANGES: Array<{ id: RangeFilter; label: string; ms?: number }> = [
  { id: "all", label: "Any time" },
  { id: "24h", label: "Last 24 hours", ms: 24 * 60 * 60 * 1000 },
  { id: "7d", label: "Last 7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { id: "30d", label: "Last 30 days", ms: 30 * 24 * 60 * 60 * 1000 },
];

/**
 * Resolve user-actor ids to a member name/email so rows never show a raw id.
 *
 * Returns `undefined` for every id while the member list is unavailable, and
 * `null` only once the list has genuinely loaded without that member in it —
 * the row renders those two facts differently and must be able to tell them
 * apart. This lookup failing degrades the actor column; it never fails the log.
 */
function useMemberNames(slug: string) {
  const membersQuery = useProjectMembers(slug);
  const resolved = membersQuery.data !== undefined;

  const names = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const m of membersQuery.data ?? []) {
      const name = [m.user.firstName, m.user.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      map.set(m.userId, name || m.user.email);
    }
    return map;
  }, [membersQuery.data]);

  const lookup = React.useCallback(
    (actorId: string | null): string | null | undefined => {
      if (!resolved || actorId === null) return undefined;
      return names.get(actorId) ?? null;
    },
    [names, resolved],
  );

  return { lookup, members: membersQuery.data ?? [] };
}

export function AuditClient({ slug }: { slug: string }) {
  const [filter, setFilter] = React.useState<ActorFilter>("all");
  const [member, setMember] = React.useState<string>("all");
  const [range, setRange] = React.useState<RangeFilter>("all");
  // Fixed at the moment the range is chosen, not derived per render — a
  // moving `from` would make every refetch a different query key.
  const [from, setFrom] = React.useState<string | undefined>(undefined);
  const [page, setPage] = React.useState(1);

  const handleRangeChange = (next: RangeFilter) => {
    setRange(next);
    const ms = RANGES.find((r) => r.id === next)?.ms;
    setFrom(ms ? new Date(Date.now() - ms).toISOString() : undefined);
  };

  const auditQuery = useProjectActionAudit(slug, {
    page,
    pageSize: PAGE_SIZE,
    actorType: filter === "all" ? undefined : filter,
    actorId: member === "all" ? undefined : member,
    from,
  });
  const { lookup: lookupActor, members } = useMemberNames(slug);

  const events = React.useMemo(
    () => auditQuery.data?.items ?? [],
    [auditQuery.data],
  );
  const clusters = React.useMemo(() => clusterAuditEvents(events), [events]);
  const isFiltered = filter !== "all" || member !== "all" || range !== "all";
  const state = useDataState(auditQuery, {
    count: events.length,
    filtered: isFiltered,
  });

  // Any scope change restarts from the first page of that scope.
  React.useEffect(() => {
    setPage(1);
  }, [filter, member, range]);

  const clearAll = () => {
    setFilter("all");
    setMember("all");
    setRange("all");
    setFrom(undefined);
  };

  const total = auditQuery.data?.total;
  const pagination = auditQuery.data
    ? {
        page: auditQuery.data.page,
        pageSize: auditQuery.data.pageSize,
        total: auditQuery.data.total,
        totalPages: auditQuery.data.totalPages,
        onPageChange: setPage,
        busy: auditQuery.isFetching,
      }
    : undefined;

  return (
    <>
      <PageHeader
        title="Activity"
        description={
          total === undefined
            ? undefined
            : `${fmtCount(total)} ${total === 1 ? "event" : "events"} in this view`
        }
        actions={<RefreshingDataBadge show={state.isRefreshing} />}
      />
      <PageToolbar
        leading={
          <FilterPills
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            size="sm"
            aria-label="Filter activity by actor"
          />
        }
        trailing={
          <>
            {members.length > 1 && (
              <Select value={member} onValueChange={setMember}>
                <SelectTrigger
                  size="sm"
                  className="text-xs"
                  aria-label="Filter activity by member"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all" className="text-xs">
                    Everyone
                  </SelectItem>
                  {members.map((m) => {
                    const name = [m.user.firstName, m.user.lastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim();
                    return (
                      <SelectItem
                        key={m.userId}
                        value={m.userId}
                        className="text-xs"
                      >
                        {name || m.user.email}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
            <Select
              value={range}
              onValueChange={(next) => handleRangeChange(next as RangeFilter)}
            >
              <SelectTrigger
                size="sm"
                className="text-xs"
                aria-label="Filter activity by time"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {RANGES.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <PageBody padding="bare" className="overflow-y-auto">
        <DataState
          state={state}
          resource="this project's activity"
          skeleton={<ListSkeleton rows={6} leading="square" trailing />}
          empty={
            // Nothing has been changed yet. That is a fact about a new
            // project, not a setup failure — so it teaches and offers no CTA.
            <EmptyState
              icon={ClockCounterClockwiseIcon}
              title="No activity yet"
              description="Every change to this project is recorded with who made it and when."
              preview={<GhostList rows={3} leading="square" />}
            />
          }
          filteredEmpty={
            <NoResults
              title="No activity matches this view"
              description="Nothing in this project's history was recorded against the selected actor, member, and time window."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={clearAll}
                >
                  Show all activity
                </Button>
              }
            />
          }
        >
          <DataList aria-label="Project activity" pagination={pagination}>
            {clusters.map((cluster) =>
              cluster.events.length === 1 ? (
                <AuditEventRow
                  key={cluster.key}
                  event={cluster.events[0]}
                  actorName={lookupActor(cluster.events[0].actorId)}
                />
              ) : (
                <AuditClusterRow
                  key={cluster.key}
                  events={cluster.events}
                  actorName={lookupActor(cluster.events[0].actorId)}
                />
              ),
            )}
          </DataList>
        </DataState>
      </PageBody>
    </>
  );
}
