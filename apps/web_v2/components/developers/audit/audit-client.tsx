"use client";

import * as React from "react";
import {
  ClockCounterClockwiseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import type {
  V2ActorType,
  V2PaginatedResponse,
  V2ProjectActionAuditDTO,
} from "@workspace/types";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyPreview,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  PageHeader,
  PageBody,
  PageToolbar,
  FilterPills,
  GhostList,
  type FilterPillOption,
} from "@/components/shared";
import { useProjectActionAudit, useProjectMembers } from "@/hooks/api";
import { AuditEventRow, AuditEventRowSkeleton } from "./audit-event-item";

const PAGE_SIZE = 25;

type ActorFilter = "all" | V2ActorType;

const FILTERS: FilterPillOption<ActorFilter>[] = [
  { id: "all", label: "All" },
  { id: "user", label: "Users" },
  { id: "api_key", label: "API keys" },
  { id: "agent_key", label: "Agents" },
  { id: "system", label: "System" },
];

/* ─── Member names ────────────────────────────────────────────────────────── */

// Resolve user-actor ids to a member name/email so rows never show raw ids.
function useMemberNames(slug: string): Map<string, string> {
  const membersQuery = useProjectMembers(slug);
  return React.useMemo(() => {
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
}

/* ─── Page data ───────────────────────────────────────────────────────────── */

/** Flattens the paginated audit response into the fields this view renders. */
function readAuditPage(
  data: V2PaginatedResponse<V2ProjectActionAuditDTO> | undefined,
) {
  return {
    events: data?.items ?? [],
    totalPages: data?.totalPages ?? 1,
    total: data?.total ?? 0,
    hasPrev: data?.hasPrev ?? false,
    hasNext: data?.hasNext ?? false,
  };
}

/* ─── Empty state ─────────────────────────────────────────────────────────── */

/** Nothing to show — the copy narrows when an actor filter is active. */
function AuditEmptyState({ filter }: { filter: ActorFilter }) {
  return (
    <div className="px-4 py-10 sm:px-6">
      <Empty className="border border-dashed py-10">
        {filter === "all" && (
          <EmptyPreview>
            <GhostList rows={3} leading="circle" trailingPill={false} />
          </EmptyPreview>
        )}
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClockCounterClockwiseIcon weight="bold" />
          </EmptyMedia>
          <EmptyTitle>
            {filter === "all"
              ? "No activity yet"
              : "No activity for this actor"}
          </EmptyTitle>
          <EmptyDescription>
            {filter === "all"
              ? "Mutating actions — moderation, key changes, member updates, integrations — will appear here as they happen."
              : "Try a different actor filter to see other events."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

/* ─── Event list ──────────────────────────────────────────────────────────── */

/** One row per audit event, with user-actor ids resolved to member names. */
function AuditEventList({
  events,
  memberNames,
}: {
  events: V2ProjectActionAuditDTO[];
  memberNames: Map<string, string>;
}) {
  return (
    <div
      role="list"
      aria-label="Project action audit"
      className="divide-y divide-border"
    >
      {events.map((event) => (
        <div key={event.id} role="listitem">
          <AuditEventRow
            event={event}
            actorName={
              event.actorId ? (memberNames.get(event.actorId) ?? null) : null
            }
          />
        </div>
      ))}
    </div>
  );
}

/* ─── Pagination ──────────────────────────────────────────────────────────── */

/** Page cursor plus the prev/next controls under the audit list. */
function AuditPagination({
  page,
  totalPages,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onPrev}
          disabled={!hasPrev}
        >
          <ArrowLeftIcon className="size-3.5" weight="bold" aria-hidden />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onNext}
          disabled={!hasNext}
        >
          Next
          <ArrowRightIcon className="size-3.5" weight="bold" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

/* ─── Body ────────────────────────────────────────────────────────────────── */

/** Loading / empty / list states for the audit body. */
function AuditBody({
  isLoading,
  events,
  filter,
  memberNames,
  page,
  totalPages,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: {
  isLoading: boolean;
  events: V2ProjectActionAuditDTO[];
  filter: ActorFilter;
  memberNames: Map<string, string>;
  page: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (isLoading) {
    return (
      <div className="divide-y divide-border">
        <AuditEventRowSkeleton />
        <AuditEventRowSkeleton />
        <AuditEventRowSkeleton />
      </div>
    );
  }

  if (events.length === 0) {
    return <AuditEmptyState filter={filter} />;
  }

  return (
    <>
      <AuditEventList events={events} memberNames={memberNames} />

      {totalPages > 1 && (
        <AuditPagination
          page={page}
          totalPages={totalPages}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onPrev={onPrev}
          onNext={onNext}
        />
      )}
    </>
  );
}

/* ─── Client ──────────────────────────────────────────────────────────────── */

export function AuditClient({ slug }: { slug: string }) {
  const [filter, setFilter] = React.useState<ActorFilter>("all");
  const [page, setPage] = React.useState(1);

  const auditQuery = useProjectActionAudit(slug, {
    page,
    pageSize: PAGE_SIZE,
    actorType: filter === "all" ? undefined : filter,
  });

  const memberNames = useMemberNames(slug);

  const { events, totalPages, total, hasPrev, hasNext } = readAuditPage(
    auditQuery.data,
  );
  const isLoading = auditQuery.isLoading;

  // Reset to page 1 whenever the active filter changes.
  React.useEffect(() => {
    setPage(1);
  }, [filter]);

  return (
    <>
      <PageHeader title="Activity" />
      <PageToolbar
        leading={
          <FilterPills
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            size="sm"
            aria-label="Filter audit events by actor"
          />
        }
        trailing={
          total > 0 ? (
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {total} {total === 1 ? "event" : "events"}
            </span>
          ) : null
        }
      />

      <PageBody padding="bare" className="overflow-y-auto">
        <AuditBody
          isLoading={isLoading}
          events={events}
          filter={filter}
          memberNames={memberNames}
          page={page}
          totalPages={totalPages}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      </PageBody>
    </>
  );
}
