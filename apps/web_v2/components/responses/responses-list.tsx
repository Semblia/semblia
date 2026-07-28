"use client";

/**
 * ResponsesList — the moderation queue.
 *
 * This is the surface owners spend their time in, and it was a flat list: no
 * error state (a 500 rendered "No responses yet"), no pagination affordance
 * despite a paginated API, no search, no keyboard, no bulk actions, and the
 * filter pills unmounted themselves while loading — the control that scopes the
 * query disappearing exactly while the query ran.
 *
 * Rebuilt on the shared data-surface system:
 *   • `useDataState` owns the ladder, so a failed fetch can no longer be
 *     mistaken for an empty inbox
 *   • filters and search live in the URL and stay mounted through every load
 *   • `useListSelection` gives j/k, x, Enter, Shift-range, and Cmd-A scoped to
 *     the current filter; the bulk bar appears on the first selection
 *   • the detail sheet is non-modal, so reading a record doesn't cost the queue
 *   • the automated moderation verdict is visible per row and in full in the
 *     sheet — the backend has produced it since Phase 6 and nothing showed it
 */

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { ChatCircleText, Gear } from "@phosphor-icons/react";
import {
  PageHeader,
  PageBody,
  RefreshingDataBadge,
  FilterPills,
  SearchField,
  EmptyState,
  NoResults,
  GhostList,
  DataState,
  DataList,
  ListSkeleton,
  BulkActionBar,
  useDataState,
  type BulkAction,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useListSelection } from "@/hooks/use-list-selection";
import { useDebounce } from "@/hooks/use-debounce";
import {
  formsPath,
  responsesImportPath,
  settingsVisibilityPath,
} from "@/lib/routes";
import type {
  V2ProjectDTO,
  V2FormResponsePublishStatus,
} from "@workspace/types";
import {
  useResponses,
  useUpdateResponseStatus,
  useUpdateResponsePublish,
  useDeleteResponse,
} from "@/hooks/api";
import { ResponseRow } from "./response-row";
import { ResponseDetailSheet } from "./response-detail-sheet";

const PAGE_SIZE = 25;

type Filter = "pending" | "approved" | "featured" | "declined" | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "pending", label: "Needs review" },
  { id: "approved", label: "Approved" },
  { id: "featured", label: "Featured" },
  { id: "declined", label: "Declined" },
  { id: "all", label: "All" },
];

/** The queue opens on the work, not on an archive. */
const DEFAULT_FILTER: Filter = "pending";

function paramsFor(filter: Filter) {
  switch (filter) {
    case "pending":
      return { reviewStatus: "PENDING" };
    case "approved":
      return { reviewStatus: "APPROVED" };
    case "featured":
      return { publishStatus: "PUBLISHED" };
    case "declined":
      return { reviewStatus: "REJECTED" };
    default:
      return {};
  }
}

export function ResponsesList({ project }: { project: V2ProjectDTO }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawFilter = (searchParams.get("status") ?? DEFAULT_FILTER) as Filter;
  const filter: Filter = FILTERS.some((f) => f.id === rawFilter)
    ? rawFilter
    : DEFAULT_FILTER;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const search = searchParams.get("q") ?? "";

  const [searchDraft, setSearchDraft] = React.useState(search);
  const debouncedSearch = useDebounce(searchDraft, 300);

  // The URL is the source of truth for what the query is scoped to, so a
  // reload, a shared link, and the back button all reproduce the same view.
  const setParams = React.useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === "") sp.delete(key);
        else sp.set(key, value);
      }
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  React.useEffect(() => {
    if (debouncedSearch === search) return;
    setParams({ q: debouncedSearch || null, page: null });
  }, [debouncedSearch, search, setParams]);

  const listQuery = useResponses(project.slug, {
    ...paramsFor(filter),
    search: search || undefined,
    sort: "newest",
    page,
    pageSize: PAGE_SIZE,
  });

  const items = React.useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data],
  );
  const state = useDataState(listQuery, {
    count: items.length,
    filtered: filter !== "all" || search.length > 0,
  });

  const statusMutation = useUpdateResponseStatus(project.slug);
  const publishMutation = useUpdateResponsePublish(project.slug);
  const deleteMutation = useDeleteResponse(project.slug);
  const busy =
    statusMutation.isPending ||
    publishMutation.isPending ||
    deleteMutation.isPending;

  const [openId, setOpenId] = React.useState<string | null>(null);
  const openIndex = items.findIndex((r) => r.id === openId);
  const openResponse = openIndex >= 0 ? items[openIndex] : null;

  const ids = React.useMemo(() => items.map((r) => r.id), [items]);
  const selection = useListSelection({
    ids,
    onActivate: setOpenId,
    // Hand the keyboard to the sheet while it owns the record.
    enabled: openId === null,
  });

  const handleStatus = (responseId: string, status: string, label: string) => {
    statusMutation.mutate(
      { responseId, status },
      {
        onSuccess: () => toast.success(label),
        onError: () => toast.error(`Couldn't ${label.toLowerCase()} it.`),
      },
    );
  };

  const handleBulkStatus = (status: string, label: string) => {
    const targets = selection.selectedIds;
    if (targets.length === 0) return;
    Promise.allSettled(
      targets.map((responseId) =>
        statusMutation.mutateAsync({ responseId, status }),
      ),
    ).then((results) => {
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) {
        toast.success(`${label} ${targets.length}`);
      } else if (failed === targets.length) {
        toast.error(`Couldn't ${label.toLowerCase()} any of them.`);
      } else {
        // Report the partial outcome honestly — "done" would be a lie.
        toast.warning(
          `${label} ${targets.length - failed} of ${targets.length}. ${failed} failed.`,
        );
      }
      selection.clear();
    });
  };

  const handlePublish = (
    responseId: string,
    status: V2FormResponsePublishStatus,
  ) => {
    publishMutation.mutate(
      { responseId, status },
      {
        onSuccess: () =>
          toast.success(status === "PUBLISHED" ? "Featured" : "Unfeatured"),
        onError: () => toast.error("Couldn't change how this is displayed."),
      },
    );
  };

  const handleDelete = (responseId: string) => {
    deleteMutation.mutate(responseId, {
      onSuccess: () => {
        toast.success("Response deleted");
        if (openId === responseId) setOpenId(null);
      },
      onError: () => toast.error("Couldn't delete this response."),
    });
  };

  const bulkActions: BulkAction[] = React.useMemo(() => {
    const actions: BulkAction[] = [];
    if (filter === "pending" || filter === "all" || filter === "declined") {
      actions.push({
        id: "approve",
        label: "Approve",
        onClick: () => handleBulkStatus("APPROVED", "Approved"),
      });
    }
    if (filter !== "declined") {
      actions.push({
        id: "reject",
        label: "Reject",
        onClick: () => handleBulkStatus("REJECTED", "Rejected"),
      });
    }
    actions.push({
      id: "archive",
      label: "Archive",
      tone: "destructive",
      onClick: () => handleBulkStatus("ARCHIVED", "Archived"),
    });
    return actions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, selection.selectedIds]);

  const pagination = listQuery.data
    ? {
        page: listQuery.data.page,
        pageSize: listQuery.data.pageSize,
        total: listQuery.data.total,
        totalPages: listQuery.data.totalPages,
        onPageChange: (next: number) => setParams({ page: String(next) }),
        busy: listQuery.isFetching,
      }
    : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Responses"
        description={
          <QueueMeta project={project} total={listQuery.data?.total} />
        }
        actions={
          <>
            <RefreshingDataBadge show={state.isRefreshing} />
            <Button asChild size="sm" variant="outline" className="text-xs">
              <Link href={responsesImportPath(project.slug)}>Import proof</Link>
            </Button>
          </>
        }
        toolbar={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            {/* Stays mounted through every load: the control that scopes the
                query must not vanish while the query runs. */}
            <FilterPills
              options={FILTERS}
              value={filter}
              onChange={(next) => setParams({ status: next, page: null })}
              size="sm"
              aria-label="Filter responses"
            />
            <SearchField
              value={searchDraft}
              onChange={setSearchDraft}
              placeholder="Search by author, role, or company"
              ariaLabel="Search responses"
              width="fixed"
            />
          </div>
        }
      />

      <AutoModerationNotice project={project} />

      <PageBody padding="bare" className="overflow-y-auto">
        <DataState
          state={state}
          resource="responses"
          align="center"
          skeleton={<ListSkeleton rows={6} leading="circle" trailing />}
          empty={<FirstRunEmpty slug={project.slug} />}
          filteredEmpty={
            <FilteredEmpty
              filter={filter}
              search={search}
              onClear={() => {
                setSearchDraft("");
                setParams({ status: null, q: null, page: null });
              }}
            />
          }
        >
          <DataList aria-label="Responses" pagination={pagination}>
            {items.map((response) => (
              <ResponseRow
                key={response.id}
                response={response}
                busy={busy}
                highlighted={selection.highlightedId === response.id}
                selected={selection.isSelected(response.id)}
                onSelectToggle={(event) => {
                  event.stopPropagation();
                  selection.toggle(response.id, event.shiftKey);
                }}
                onOpen={() => setOpenId(response.id)}
                onApprove={() =>
                  handleStatus(response.id, "APPROVED", "Approved")
                }
                onReject={() =>
                  handleStatus(response.id, "REJECTED", "Rejected")
                }
                onTogglePublish={(next) => handlePublish(response.id, next)}
                onDelete={() => handleDelete(response.id)}
              />
            ))}
          </DataList>
        </DataState>
      </PageBody>

      <BulkActionBar
        count={selection.count}
        scopeLabel={
          filter === "all"
            ? "responses"
            : `${FILTERS.find((f) => f.id === filter)?.label.toLowerCase()} responses`
        }
        scopeTotal={items.length}
        actions={bulkActions}
        onClear={selection.clear}
        busy={busy}
      />

      <ResponseDetailSheet
        response={openResponse}
        busy={busy}
        onClose={() => setOpenId(null)}
        onPrev={
          openIndex > 0 ? () => setOpenId(items[openIndex - 1].id) : undefined
        }
        onNext={
          openIndex >= 0 && openIndex < items.length - 1
            ? () => setOpenId(items[openIndex + 1].id)
            : undefined
        }
        onApprove={(id) => handleStatus(id, "APPROVED", "Approved")}
        onReject={(id) => handleStatus(id, "REJECTED", "Rejected")}
        onTogglePublish={handlePublish}
      />
    </div>
  );
}

/**
 * Inline meta on the header's second line — state, not prose. The page header
 * carries identity and page-scoped state; explanation belongs to sections.
 */
function QueueMeta({
  project,
  total,
}: {
  project: V2ProjectDTO;
  total: number | undefined;
}) {
  const pending = project._count?.pendingModeration;
  return (
    <>
      {total === undefined ? "Loading…" : `${total} in this view`}
      {typeof pending === "number" && pending > 0 && (
        <>
          <span aria-hidden className="mx-1.5 text-border">
            ·
          </span>
          <span className="text-warning">{pending} awaiting review</span>
        </>
      )}
    </>
  );
}

/**
 * P6 — the screen tells the truth about the system. With auto-moderation off,
 * every submission lands unchecked and waits for a human, and the owner has no
 * way to know that from this page. Says so once, with the fix one click away.
 */
function AutoModerationNotice({ project }: { project: V2ProjectDTO }) {
  if (project.autoModeration) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-surface px-4 py-2 text-xs text-muted-foreground sm:px-6">
      <Gear className="size-3.5 shrink-0" weight="bold" aria-hidden />
      <span className="min-w-0 flex-1">
        Auto-moderation is off — every submission waits for you, unchecked.
      </span>
      <Link
        href={settingsVisibilityPath(project.slug)}
        className="shrink-0 font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        Turn it on
      </Link>
    </div>
  );
}

function FirstRunEmpty({ slug }: { slug: string }) {
  return (
    <EmptyState
      icon={ChatCircleText}
      title="No responses yet"
      description="Responses are the testimonials people submit through your forms. Review them here, approve the good ones, and feature them to show up in your widgets."
      preview={<GhostList rows={3} leading="circle" trailingPill />}
      action={
        <Button asChild size="sm" className="text-xs">
          <Link href={formsPath(slug)}>Share a form to collect</Link>
        </Button>
      }
    />
  );
}

/**
 * A filtered miss is a different fact from an empty inbox, so it gets different
 * copy and a different action: clear the filter, not create the first record.
 * It quotes the query back, because "no results" without the query is a dead end.
 */
function FilteredEmpty({
  filter,
  search,
  onClear,
}: {
  filter: Filter;
  search: string;
  onClear: () => void;
}) {
  const label = FILTERS.find((f) => f.id === filter)?.label ?? "this filter";

  if (search) {
    return (
      <NoResults
        title={`Nothing matches “${search}”`}
        description={`No response in ${label.toLowerCase()} has that author, role, or company.`}
        action={
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={onClear}
          >
            Clear search and filters
          </Button>
        }
      />
    );
  }

  // "Nothing pending" is a good outcome, not a setup failure. No CTA — there is
  // nothing for the user to fix.
  if (filter === "pending") {
    return (
      <NoResults
        title="You're all caught up"
        description="Nothing is waiting for review. New submissions land here as they arrive."
      />
    );
  }

  return (
    <NoResults
      title={`No ${label.toLowerCase()} responses`}
      description="Nothing in this project has reached that state yet."
      action={
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={onClear}
        >
          Show all responses
        </Button>
      }
    />
  );
}
