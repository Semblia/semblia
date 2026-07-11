"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowClockwise as ArrowClockwiseIcon,
  ArrowRight as ArrowRightIcon,
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon,
  Plus as PlusIcon,
  WarningCircle as WarningCircleIcon,
  XCircle as XCircleIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import type { V2ProjectOwnershipTransferDTO } from "@workspace/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HeaderSep,
  PageBody,
  PageHeader,
  FilterPills,
  RefreshingDataBadge,
  SearchField,
  ViewToggle,
} from "@/components/shared";
import {
  useAcceptProjectTransfer,
  useDeclineProjectTransfer,
  useMyProjectTransfers,
} from "@/hooks/api";
import { useProjects, type ProjectFilter } from "@/hooks/use-projects";
import { PROJECT_TYPE_LABELS } from "@/lib/format";

import { ProjectRowSkeleton, ProjectCardSkeleton } from "./project-skeletons";
import { ProjectRow } from "./project-row";
import { ProjectCard, NewProjectTile } from "./project-card";
import { EmptySearch, EmptyProjects } from "./project-empty-states";

function transferUserName(user: V2ProjectOwnershipTransferDTO["fromUser"]) {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
  );
}

function transferExpiry(value: string) {
  const expires = new Date(value).getTime();
  if (!Number.isFinite(expires)) return "expires soon";
  const diffMs = expires - Date.now();
  if (diffMs <= 0) return "expired";
  const hours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `expires in ${hours}h`;
  return `expires in ${Math.ceil(hours / 24)}d`;
}

function IncomingTransfers({
  transfers,
  onReview,
}: {
  transfers: V2ProjectOwnershipTransferDTO[];
  onReview: (transfer: V2ProjectOwnershipTransferDTO) => void;
}) {
  if (transfers.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="overflow-hidden rounded-lg border border-warning/30 bg-warning/[0.06]">
        <div className="divide-y divide-warning/20">
          {transfers.map((transfer) => (
            <div
              key={transfer.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ClockIcon className="size-4 text-warning" aria-hidden />
                  Ownership request
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {transferUserName(transfer.fromUser)} wants you to own{" "}
                  <span className="font-medium text-foreground">
                    {transfer.projectName}
                  </span>{" "}
                  · {transferExpiry(transfer.expiresAt)}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onReview(transfer)}
                className="gap-1.5 self-start sm:self-auto"
              >
                Review
                <ArrowRightIcon className="size-3.5" aria-hidden />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IncomingTransferDialog({
  transfer,
  open,
  onOpenChange,
  onAccept,
  onDecline,
  pending,
}: {
  transfer: V2ProjectOwnershipTransferDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  onDecline: () => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review ownership transfer</DialogTitle>
          <DialogDescription>
            Accepting makes you the primary owner. The current owner stays as an
            admin, and billing remains on their account.
          </DialogDescription>
        </DialogHeader>

        {transfer && (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground">
              {transfer.projectName}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Requested by {transferUserName(transfer.fromUser)} ·{" "}
              {transferExpiry(transfer.expiresAt)}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDecline}
            disabled={pending}
            className="gap-1.5"
          >
            <XCircleIcon className="size-3.5" aria-hidden />
            Decline
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onAccept}
            disabled={pending}
            className="gap-1.5"
          >
            <CheckCircleIcon className="size-3.5" aria-hidden />
            Accept ownership
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

export function ProjectsClient() {
  const {
    projects,
    filtered,
    loading,
    refreshing,
    error,
    refetch,
    view,
    setView,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    typeCounts,
    totalResponses,
    totalPending,
  } = useProjects();
  const incomingTransfers = useMyProjectTransfers({ freshOnMount: true });
  const acceptTransfer = useAcceptProjectTransfer();
  const declineTransfer = useDeclineProjectTransfer();
  const [reviewTransfer, setReviewTransfer] =
    React.useState<V2ProjectOwnershipTransferDTO | null>(null);
  const transfers = incomingTransfers.data ?? [];
  const transferPending = acceptTransfer.isPending || declineTransfer.isPending;

  // Build filter pill options from data
  const filterOptions: { id: ProjectFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: typeCounts.get("all") ?? 0 },
    ...([...typeCounts.entries()] as [ProjectFilter, number][])
      .filter(([k]) => k !== "all")
      .map(([k, count]) => ({
        id: k,
        label: PROJECT_TYPE_LABELS[k as keyof typeof PROJECT_TYPE_LABELS] ?? k,
        count,
      })),
  ];

  // Toolbar (filter pills + search + view toggle) is earned by content, not
  // granted by default: at small workspaces (1-5 projects) there is nothing to
  // filter, search, or switch view of, so the controls are noise.
  const showToolbar = !loading && projects.length >= 6;
  const isEmpty = !loading && !error && projects.length === 0;
  // Only a full load failure gets the error surface; background refresh
  // failures keep showing cached data per the live-query policy.
  const loadFailed = !loading && Boolean(error) && projects.length === 0;
  // The ghost tile is the create affordance inside the canvas; it bows out
  // when the grid is showing a filtered subset rather than the workspace.
  const showGhostTile = !search && typeFilter === "all";

  async function handleAcceptTransfer() {
    if (!reviewTransfer) return;
    try {
      await acceptTransfer.mutateAsync(reviewTransfer.id);
      toast.success("Ownership accepted");
      setReviewTransfer(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to accept ownership";
      toast.error(message);
    }
  }

  async function handleDeclineTransfer() {
    if (!reviewTransfer) return;
    try {
      await declineTransfer.mutateAsync(reviewTransfer.id);
      toast.success("Ownership transfer declined");
      setReviewTransfer(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to decline transfer";
      toast.error(message);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Projects"
        description={
          loading ? (
            <span
              aria-hidden
              className="inline-block h-3 w-44 animate-shimmer rounded bg-muted"
            />
          ) : isEmpty || loadFailed ? undefined : (
            <>
              {projects.length} project{projects.length === 1 ? "" : "s"}
              <HeaderSep />
              {totalResponses > 0
                ? `${totalResponses} response${totalResponses === 1 ? "" : "s"}`
                : "no responses yet"}
              {totalPending > 0 && (
                <>
                  <HeaderSep />
                  <span className="font-medium text-warning">
                    {totalPending} pending review
                  </span>
                </>
              )}
            </>
          )
        }
        actions={
          <div className="flex items-center gap-3">
            <RefreshingDataBadge show={refreshing} />
            {!isEmpty && (
              <Button size="sm" className="gap-1.5" asChild>
                <Link href="/projects/new">
                  <PlusIcon className="size-3.5" />
                  New project
                </Link>
              </Button>
            )}
          </div>
        }
        toolbar={
          showToolbar ? (
            <>
              <FilterPills<ProjectFilter>
                aria-label="Filter projects by type"
                options={filterOptions}
                value={typeFilter}
                onChange={setTypeFilter}
              />
              <div className="ml-auto flex items-center gap-3">
                <SearchField
                  value={search}
                  onChange={setSearch}
                  placeholder="Search projects…"
                  ariaLabel="Search projects"
                />
                <ViewToggle value={view} onChange={setView} />
              </div>
            </>
          ) : undefined
        }
      />

      <PageBody padding="bare" className="flex flex-1 flex-col overflow-y-auto">
        {transfers.length > 0 && (
          <div className="px-4 sm:px-6">
            <IncomingTransfers
              transfers={transfers}
              onReview={setReviewTransfer}
            />
          </div>
        )}

        {/* ── Content ── */}
        {isEmpty ? (
          <EmptyProjects />
        ) : (
          <div className="px-4 pb-16 sm:px-6">
            {loading ? (
              view === "list" ? (
                <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
                  {[0, 1, 2].map((i) => (
                    <ProjectRowSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-4 sm:auto-rows-fr sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[0, 1, 2].map((i) => (
                    <ProjectCardSkeleton key={i} />
                  ))}
                </div>
              )
            ) : loadFailed ? (
              <LoadFailed onRetry={() => refetch()} />
            ) : filtered.length === 0 && search ? (
              <EmptySearch query={search} onClear={() => setSearch("")} />
            ) : view === "list" ? (
              <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
                {filtered.map((project, i) => (
                  <ProjectRow key={project.id} project={project} index={i} />
                ))}
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:auto-rows-fr sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((project, i) => (
                  <ProjectCard key={project.id} project={project} index={i} />
                ))}
                {showGhostTile && <NewProjectTile index={filtered.length} />}
              </div>
            )}
          </div>
        )}
      </PageBody>

      <IncomingTransferDialog
        transfer={reviewTransfer}
        open={reviewTransfer !== null}
        onOpenChange={(open) => {
          if (!open) setReviewTransfer(null);
        }}
        onAccept={handleAcceptTransfer}
        onDecline={handleDeclineTransfer}
        pending={transferPending}
      />
    </div>
  );
}

// ── Load-failure state ─────────────────────────────────────────────────────────

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="animate-fade-up flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
        <WarningCircleIcon className="size-5 text-destructive" aria-hidden />
      </span>
      <p className="mt-3 text-[15px] font-semibold tracking-tight text-foreground">
        Couldn&rsquo;t load your projects
      </p>
      <p className="mt-1.5 max-w-[32ch] text-[12.5px] leading-relaxed text-muted-foreground/85">
        The request didn&rsquo;t make it through. Check your connection and try
        again.
      </p>
      <Button
        type="button"
        onClick={onRetry}
        variant="outline"
        size="default"
        className="mt-4"
      >
        <ArrowClockwiseIcon className="size-3.5" />
        Try again
      </Button>
    </div>
  );
}
