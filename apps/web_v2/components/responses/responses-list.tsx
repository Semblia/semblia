"use client";

/**
 * ResponsesList — the review queue, and the project's home.
 *
 * A real two-column split (V5): the list is a fixed 380–420px column and the
 * record takes the rest, both scrolling independently, both in flow. The first
 * build floated the record as a fixed overlay, which covered the page header
 * and its actions — you could not reach the queue's own controls while reading.
 *
 * Chrome is two lines, not three bands (V6): identity and count, then filters
 * and search. The one filled button on the page belongs to the page's job,
 * which is reviewing — importing is a secondary route in and is styled as one
 * (V7).
 *
 * Keyboard is the point of a queue: ↑↓/jk move, Enter opens, A approves, R
 * rejects, X selects, Esc clears. Nothing is selected on mount.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { ChatCircleText, Gear, DownloadSimple } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  PageBody,
  FilterPills,
  SearchField,
  EmptyState,
  NoResults,
  GhostList,
  DataState,
  BulkActionBar,
  useDataState,
  type BulkAction,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useListSelection } from "@/hooks/use-list-selection";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { isEditableTarget } from "@/lib/format";
import { formsPath, importPath, settingsVisibilityPath } from "@/lib/routes";
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
import { ResponseQueueRow } from "./response-queue-row";
import { ResponseRecord } from "./response-record";

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
  const isDesktop = useIsDesktop();

  const rawFilter = (searchParams.get("status") ?? DEFAULT_FILTER) as Filter;
  const filter: Filter = FILTERS.some((f) => f.id === rawFilter)
    ? rawFilter
    : DEFAULT_FILTER;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const search = searchParams.get("q") ?? "";

  const [searchDraft, setSearchDraft] = React.useState(search);
  const debouncedSearch = useDebounce(searchDraft, 300);

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

  // ── Which record is open ────────────────────────────────────────────────
  const [openId, setOpenId] = React.useState<string | null>(null);
  const openIndex = items.findIndex((r) => r.id === openId);
  const openResponse = openIndex >= 0 ? items[openIndex] : null;

  // On desktop the record column is always populated, so an untouched queue
  // still shows something to read. On mobile there is one column, so nothing
  // opens until asked.
  React.useEffect(() => {
    if (!isDesktop) return;
    if (items.length === 0) {
      setOpenId(null);
      return;
    }
    if (!items.some((r) => r.id === openId)) setOpenId(items[0].id);
  }, [isDesktop, items, openId]);

  const ids = React.useMemo(() => items.map((r) => r.id), [items]);
  const selection = useListSelection({ ids, onActivate: setOpenId });

  const step = React.useCallback(
    (delta: number) => {
      if (openIndex < 0) return;
      const next = items[openIndex + delta];
      if (next) setOpenId(next.id);
    },
    [items, openIndex],
  );

  // ── Decisions ───────────────────────────────────────────────────────────

  const decide = React.useCallback(
    (responseId: string, status: string, label: string) => {
      // Advance before the mutation settles: the record the reviewer just ruled
      // on leaves the "Needs review" filter, and standing on an empty record
      // while the list refetches is what makes triage feel slow.
      const index = items.findIndex((r) => r.id === responseId);
      const next = items[index + 1] ?? items[index - 1] ?? null;

      statusMutation.mutate(
        { responseId, status },
        {
          onSuccess: () => {
            toast.success(label);
            if (openId === responseId) setOpenId(next?.id ?? null);
          },
          onError: () => toast.error(`Couldn't ${label.toLowerCase()} it.`),
        },
      );
    },
    [items, openId, statusMutation],
  );

  const handleBulk = (status: string, label: string) => {
    const targets = selection.selectedIds;
    if (targets.length === 0) return;
    void Promise.allSettled(
      targets.map((responseId) =>
        statusMutation.mutateAsync({ responseId, status }),
      ),
    ).then((results) => {
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) toast.success(`${label} ${targets.length}`);
      else if (failed === targets.length)
        toast.error(`Couldn't ${label.toLowerCase()} any of them.`);
      else
        toast.warning(
          `${label} ${targets.length - failed} of ${targets.length}. ${failed} failed.`,
        );
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
    const index = items.findIndex((r) => r.id === responseId);
    const next = items[index + 1] ?? items[index - 1] ?? null;
    deleteMutation.mutate(responseId, {
      onSuccess: () => {
        toast.success("Response deleted");
        if (openId === responseId) setOpenId(next?.id ?? null);
      },
      onError: () => toast.error("Couldn't delete this response."),
    });
  };

  // ── Decision shortcuts ──────────────────────────────────────────────────
  // `useListSelection` owns movement and selection; these own the verdict, so
  // a reviewer never has to reach for the mouse between records.
  React.useEffect(() => {
    const target = selection.highlightedId ?? openId;
    if (!target) return;

    const onKey = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) {
        return;
      }
      const record = items.find((r) => r.id === target);
      if (!record || record.reviewStatus !== "PENDING") return;

      if (event.key === "a" || event.key === "A") {
        event.preventDefault();
        decide(target, "APPROVED", "Approved");
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        decide(target, "REJECTED", "Rejected");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, items, openId, selection.highlightedId]);

  const bulkActions: BulkAction[] = React.useMemo(() => {
    const actions: BulkAction[] = [];
    if (filter !== "approved" && filter !== "featured") {
      actions.push({
        id: "approve",
        label: "Approve",
        onClick: () => handleBulk("APPROVED", "Approved"),
      });
    }
    if (filter !== "declined") {
      actions.push({
        id: "reject",
        label: "Reject",
        onClick: () => handleBulk("REJECTED", "Rejected"),
      });
    }
    actions.push({
      id: "archive",
      label: "Archive",
      tone: "destructive",
      onClick: () => handleBulk("ARCHIVED", "Archived"),
    });
    return actions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, selection.selectedIds]);

  const total = listQuery.data?.total;
  const totalPages = listQuery.data?.totalPages ?? 1;
  const showRecord = openResponse !== null && (isDesktop || openId !== null);
  // P9 — never two empty states side by side. With nothing to select, the
  // record column has no reason to exist: the list's own state (empty, error,
  // caught-up) speaks alone at full width. The split stays mounted during the
  // initial load so geometry doesn't jump when rows arrive.
  const keepSplit = items.length > 0 || state.kind === "loading-initial";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Line 1: identity + count + secondary route in ── */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-5">
        <h1 className="text-sm font-semibold tracking-tight text-foreground">
          Responses
        </h1>
        <QueueCount
          project={project}
          total={total}
          loading={state.kind === "loading-initial"}
        />
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="ml-auto h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Link href={importPath(project.slug)}>
            <DownloadSimple className="size-3.5" weight="bold" aria-hidden />
            Import proof
          </Link>
        </Button>
      </header>

      {/* ── Line 2: filters + search ── */}
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-5">
        <div className="scrollbar-none min-w-0 flex-1 overflow-x-auto">
          <FilterPills
            options={FILTERS}
            value={filter}
            onChange={(next) => setParams({ status: next, page: null })}
            size="sm"
            aria-label="Filter responses"
          />
        </div>
        <div className="shrink-0">
          <SearchField
            value={searchDraft}
            onChange={setSearchDraft}
            placeholder="Search people"
            ariaLabel="Search responses"
            width="fixed"
          />
        </div>
      </div>

      <AutoModerationNotice project={project} />

      {/* ── The split ── */}
      {/* `flex flex-col` so the split stretches to the viewport: PageBody is
          not a flex container by default, and without it the two columns end
          at their content and the desk shows through under both. */}
      <PageBody padding="bare" className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
          {/* List column */}
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-col border-border",
              keepSplit && "lg:w-[380px] lg:shrink-0 lg:border-r xl:w-[420px]",
              showRecord && !isDesktop
                ? "hidden"
                : keepSplit
                  ? "flex-1 lg:flex-none"
                  : "flex-1",
            )}
          >
            <DataState
              state={state}
              resource="responses"
              align="center"
              className="min-h-0"
              skeleton={<QueueSkeleton />}
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
              <div
                role="list"
                aria-label="Responses"
                className="min-h-0 flex-1 divide-y divide-border/70 overflow-y-auto"
              >
                {items.map((response) => (
                  <ResponseQueueRow
                    key={response.id}
                    response={response}
                    active={response.id === openId}
                    highlighted={selection.highlightedId === response.id}
                    selected={selection.isSelected(response.id)}
                    selectionActive={selection.count > 0}
                    busy={busy}
                    onOpen={() => setOpenId(response.id)}
                    onSelectToggle={(event) => {
                      event.stopPropagation();
                      selection.toggle(response.id, event.shiftKey);
                    }}
                    onApprove={() =>
                      decide(response.id, "APPROVED", "Approved")
                    }
                    onReject={() => decide(response.id, "REJECTED", "Rejected")}
                  />
                ))}
              </div>
            </DataState>

            {totalPages > 1 && (
              <QueuePager
                page={page}
                totalPages={totalPages}
                busy={listQuery.isFetching}
                onChange={(next) => setParams({ page: String(next) })}
              />
            )}

            <BulkActionBar
              count={selection.count}
              scopeLabel="selected"
              actions={bulkActions}
              onClear={selection.clear}
              busy={busy}
              className="border-t"
            />
          </div>

          {/* Record column — the testimonial being judged sits on paper, one
              step lifted from the desk the queue sits on. Only rendered while
              there is something to select (P9). */}
          {keepSplit && (
            <div
              className={cn(
                "min-h-0 min-w-0 flex-1 bg-card",
                showRecord ? "flex" : "hidden lg:flex",
              )}
            >
              {openResponse ? (
                <ResponseRecord
                  response={openResponse}
                  busy={busy}
                  position={{ index: openIndex, total: items.length }}
                  onPrev={openIndex > 0 ? () => step(-1) : undefined}
                  onNext={
                    openIndex >= 0 && openIndex < items.length - 1
                      ? () => step(1)
                      : undefined
                  }
                  onBack={() => setOpenId(null)}
                  onApprove={() =>
                    decide(openResponse.id, "APPROVED", "Approved")
                  }
                  onReject={() =>
                    decide(openResponse.id, "REJECTED", "Rejected")
                  }
                  onTogglePublish={(next) =>
                    handlePublish(openResponse.id, next)
                  }
                  onDelete={() => handleDelete(openResponse.id)}
                />
              ) : (
                <RecordPlaceholder loading={state.kind === "loading-initial"} />
              )}
            </div>
          )}
        </div>
      </PageBody>
    </div>
  );
}

// ── Header pieces ────────────────────────────────────────────────────────────

function QueueCount({
  project,
  total,
  loading,
}: {
  project: V2ProjectDTO;
  total: number | undefined;
  loading: boolean;
}) {
  const pending = project._count?.pendingModeration;
  if (loading) return <Skeleton className="animate-shimmer h-3 w-20" />;
  // A bare "1" beside the title says nothing. The count names what it counts,
  // and the pending figure is the one that should pull the eye.
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="tabular-nums">{total ?? 0} total</span>
      {typeof pending === "number" && pending > 0 && (
        <>
          <span aria-hidden className="text-border">
            ·
          </span>
          <span className="tabular-nums font-medium text-warning">
            {pending} awaiting review
          </span>
        </>
      )}
    </p>
  );
}

/** P6 — the screen tells the truth about the system. */
function AutoModerationNotice({ project }: { project: V2ProjectDTO }) {
  if (project.autoModeration) return null;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-surface px-4 py-1.5 text-[11px] text-muted-foreground sm:px-5">
      <Gear className="size-3 shrink-0" weight="bold" aria-hidden />
      <span className="min-w-0 flex-1">
        Automatic checks are off — every submission arrives unchecked.
      </span>
      <Link
        href={settingsVisibilityPath(project.slug)}
        className="shrink-0 font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        Turn on
      </Link>
    </div>
  );
}

// ── List column pieces ───────────────────────────────────────────────────────

function QueueSkeleton() {
  const widths = ["w-24", "w-32", "w-20", "w-28", "w-24", "w-32"];
  return (
    <div aria-hidden className="divide-y divide-border/70">
      {widths.map((w, i) => (
        <div key={i} className="flex items-start gap-2.5 px-3 py-2.5">
          <span className="size-7 shrink-0 rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className={cn("animate-shimmer h-3", w)} />
            <Skeleton className="animate-shimmer h-2.5 w-full" />
            <Skeleton className="animate-shimmer h-2 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function QueuePager({
  page,
  totalPages,
  busy,
  onChange,
}: {
  page: number;
  totalPages: number;
  busy: boolean;
  onChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Pagination"
      className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-3 py-2"
    >
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-[11px]"
        disabled={page <= 1 || busy}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </Button>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-[11px]"
        disabled={page >= totalPages || busy}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}

// ── Record column placeholder ────────────────────────────────────────────────

/**
 * The right column while rows exist but none is open. The column no longer
 * renders at all when the list has nothing to select (P9), so this never
 * echoes the list's own empty or error state — during the initial load it
 * stays a quiet surface instead of announcing "loading" beside a skeleton
 * that already says so.
 */
function RecordPlaceholder({ loading }: { loading: boolean }) {
  return (
    <div className="bg-dot-grid flex flex-1 flex-col items-center justify-center gap-1 p-6 text-center">
      {!loading && (
        <>
          <p className="text-sm font-medium text-foreground">
            Nothing selected
          </p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Pick a response on the left to read it in full, or use ↑ and ↓ to
            walk the queue.
          </p>
        </>
      )}
    </div>
  );
}

// ── Empty states ─────────────────────────────────────────────────────────────

function FirstRunEmpty({ slug }: { slug: string }) {
  return (
    <EmptyState
      icon={ChatCircleText}
      title="No responses yet"
      description="Responses are the testimonials people submit through your forms. Review them here, then feature the good ones in your widgets."
      preview={<GhostList rows={3} leading="circle" trailingPill />}
      action={
        <Button asChild size="sm" className="text-xs">
          <Link href={formsPath(slug)}>Share a form to collect</Link>
        </Button>
      }
      className="px-4"
    />
  );
}

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

  // Nothing pending is a good outcome, not a setup failure — reassurance, no CTA.
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
