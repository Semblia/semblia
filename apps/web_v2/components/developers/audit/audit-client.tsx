"use client";

import * as React from "react";
import {
  ClockCounterClockwiseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import type { V2ActorType } from "@workspace/types";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  PageBody,
  PageToolbar,
  FilterPills,
  type FilterPillOption,
} from "@/components/shared";
import { useProjectActionAudit, useProjectMembers } from "@/hooks/api";
import { DeveloperShell } from "@/components/developers/developer-shell";
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

export function AuditClient({ slug }: { slug: string }) {
  const [filter, setFilter] = React.useState<ActorFilter>("all");
  const [page, setPage] = React.useState(1);

  const auditQuery = useProjectActionAudit(slug, {
    page,
    pageSize: PAGE_SIZE,
    actorType: filter === "all" ? undefined : filter,
  });

  // Resolve user-actor ids to a member name/email so rows never show raw ids.
  const membersQuery = useProjectMembers(slug);
  const memberNames = React.useMemo(() => {
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

  const events = auditQuery.data?.items ?? [];
  const totalPages = auditQuery.data?.totalPages ?? 1;
  const total = auditQuery.data?.total ?? 0;
  const isLoading = auditQuery.isLoading;

  // Reset to page 1 whenever the active filter changes.
  React.useEffect(() => {
    setPage(1);
  }, [filter]);

  return (
    <DeveloperShell slug={slug} active="audit">
      <PageToolbar
        contained
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

      <PageBody contained padding="bare" className="overflow-y-auto">
        {isLoading ? (
          <div className="divide-y divide-border">
            <AuditEventRowSkeleton />
            <AuditEventRowSkeleton />
            <AuditEventRowSkeleton />
          </div>
        ) : events.length === 0 ? (
          <div className="px-4 py-10 sm:px-6">
            <Empty className="border border-dashed py-10">
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
        ) : (
          <>
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
                      event.actorId
                        ? (memberNames.get(event.actorId) ?? null)
                        : null
                    }
                  />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!auditQuery.data?.hasPrev}
                  >
                    <ArrowLeftIcon
                      className="size-3.5"
                      weight="bold"
                      aria-hidden
                    />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!auditQuery.data?.hasNext}
                  >
                    Next
                    <ArrowRightIcon
                      className="size-3.5"
                      weight="bold"
                      aria-hidden
                    />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </PageBody>
    </DeveloperShell>
  );
}
