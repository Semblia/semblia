"use client";

/**
 * AuditClient — the project activity log.
 *
 * The log is the record of who changed what, so its failure modes matter more
 * than most. Two of them were live here:
 *
 *   • the state ladder was hand-written, so a failed request rendered "No
 *     activity yet" — an audit log that claims nothing happened because it
 *     could not be read is the worst possible lie for this surface
 *   • its Previous/Next chrome said "Page 2 of 9" and nothing about how many
 *     events exist, on a list that is paginated 25 at a time
 *
 * Both now come from the shared primitives: `DataState` derives error before
 * empty, and `DataList` renders the affordance straight from the API's own
 * `total` / `totalPages`.
 */

import * as React from "react";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import type { V2ActorType } from "@workspace/types";
import { Button } from "@/components/ui/button";
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

  return React.useCallback(
    (actorId: string | null): string | null | undefined => {
      if (!resolved || actorId === null) return undefined;
      return names.get(actorId) ?? null;
    },
    [names, resolved],
  );
}

export function AuditClient({ slug }: { slug: string }) {
  const [filter, setFilter] = React.useState<ActorFilter>("all");
  const [page, setPage] = React.useState(1);

  const auditQuery = useProjectActionAudit(slug, {
    page,
    pageSize: PAGE_SIZE,
    actorType: filter === "all" ? undefined : filter,
  });
  const lookupActor = useMemberNames(slug);

  const events = React.useMemo(
    () => auditQuery.data?.items ?? [],
    [auditQuery.data],
  );
  const state = useDataState(auditQuery, {
    count: events.length,
    filtered: filter !== "all",
  });

  // Reset to page 1 whenever the active filter changes.
  React.useEffect(() => {
    setPage(1);
  }, [filter]);

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
              description="Every change that alters this project — moderation decisions, key and webhook changes, member updates, integrations — is recorded here with who made it and when."
              preview={<GhostList rows={3} leading="square" />}
            />
          }
          filteredEmpty={
            <NoResults
              title={`No activity from ${FILTERS.find((f) => f.id === filter)?.label.toLowerCase() ?? "this actor"}`}
              description="Nothing in this project's history was recorded against that kind of actor."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setFilter("all")}
                >
                  Show all activity
                </Button>
              }
            />
          }
        >
          <DataList aria-label="Project activity" pagination={pagination}>
            {events.map((event) => (
              <AuditEventRow
                key={event.id}
                event={event}
                actorName={lookupActor(event.actorId)}
              />
            ))}
          </DataList>
        </DataState>
      </PageBody>
    </>
  );
}
