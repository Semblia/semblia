"use client";

/**
 * ResponsesList — every submission, one full-width queue.
 *
 * List → detail: this page is the filterable index, and each row opens its
 * own page at `/[slug]/responses/[id]`. The old two-column split put the
 * record and the queue on one screen and the screen was doing two jobs at
 * once — reviewers reported it as confusing, so the record moved out.
 *
 * Chrome is two lines (V6): identity and count, then filters — status pills,
 * form, source, sort, search. Keyboard still matters in a queue: ↑↓/jk move,
 * Enter opens the record, A approves, R rejects, X selects, Esc clears.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListSelection,
  type ListSelection,
} from "@/hooks/use-list-selection";
import { useDebounce } from "@/hooks/use-debounce";
import { isEditableTarget } from "@/lib/format";
import {
  formsPath,
  importPath,
  responsePath,
  settingsVisibilityPath,
} from "@/lib/routes";
import type { V2ProjectDTO } from "@workspace/types";
import {
  useResponses,
  useFormsList,
  useUpdateResponseStatus,
  type ResponsesListParams,
} from "@/hooks/api";
import { ResponseQueueRow } from "./response-queue-row";

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

const SORTS = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "rating_desc", label: "Highest rating" },
  { id: "rating_asc", label: "Lowest rating" },
] as const;

type Sort = (typeof SORTS)[number]["id"];

const SOURCES = [
  { id: "all", label: "All sources", origin: undefined },
  { id: "form", label: "From forms", origin: "FORM" },
  { id: "import", label: "Imported", origin: "IMPORT" },
] as const;

type Source = (typeof SOURCES)[number]["id"];

/** The query fragment each status pill stands for. */
const FILTER_QUERY: Record<Filter, ResponsesListParams> = {
  pending: { reviewStatus: "PENDING" },
  approved: { reviewStatus: "APPROVED" },
  featured: { publishStatus: "PUBLISHED" },
  declined: { reviewStatus: "REJECTED" },
  all: {},
};

// ── URL state ────────────────────────────────────────────────────────────────
// The URL is the single source of truth for every filter; the only local
// state is the search draft while it debounces.

interface QueueParams {
  filter: Filter;
  page: number;
  search: string;
  formId: string;
  source: Source;
  sort: Sort;
}

type SetParams = (next: Record<string, string | null>) => void;

/** An unknown value in the URL falls back instead of breaking the queue. */
function pickValid<T extends string>(
  raw: string,
  options: readonly { id: T }[],
  fallback: T,
): T {
  return options.some((o) => o.id === raw) ? (raw as T) : fallback;
}

function parsePage(raw: string | null): number {
  return Math.max(1, Number(raw ?? "1") || 1);
}

function parseQueueParams(searchParams: URLSearchParams): QueueParams {
  return {
    filter: pickValid(
      searchParams.get("status") ?? DEFAULT_FILTER,
      FILTERS,
      DEFAULT_FILTER,
    ),
    page: parsePage(searchParams.get("page")),
    search: searchParams.get("q") ?? "",
    formId: searchParams.get("form") ?? "",
    source: pickValid(searchParams.get("source") ?? "all", SOURCES, "all"),
    sort: pickValid(searchParams.get("sort") ?? "newest", SORTS, "newest"),
  };
}

/** Read the queue's filters from the URL; write changes straight back to it. */
function useQueueUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParams = React.useCallback<SetParams>(
    (next) => {
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

  return { queue: parseQueueParams(searchParams), setParams };
}

/** Local draft of the search box, synced to `?q=` after a debounce. */
function useSearchDraft(search: string, setParams: SetParams) {
  const [searchDraft, setSearchDraft] = React.useState(search);
  const debouncedSearch = useDebounce(searchDraft, 300);

  React.useEffect(() => {
    if (debouncedSearch === search) return;
    setParams({ q: debouncedSearch || null, page: null });
  }, [debouncedSearch, search, setParams]);

  return [searchDraft, setSearchDraft] as const;
}

/** Everything the list endpoint needs, derived from the URL state. */
function listQueryParams(queue: QueueParams): ResponsesListParams {
  return {
    ...FILTER_QUERY[queue.filter],
    formId: queue.formId || undefined,
    origin: SOURCES.find((s) => s.id === queue.source)?.origin,
    search: queue.search || undefined,
    sort: queue.sort,
    page: queue.page,
    pageSize: PAGE_SIZE,
  };
}

/** Whether any filter narrows the queue below "everything". */
function hasActiveFilters(queue: QueueParams): boolean {
  if (queue.filter !== "all") return true;
  if (queue.search.length > 0) return true;
  if (queue.formId !== "") return true;
  return queue.source !== "all";
}

// ── Decisions ────────────────────────────────────────────────────────────────

type Decide = (
  responseId: string,
  status: string,
  done: string,
  verb: string,
) => void;

type StatusMutation = ReturnType<typeof useUpdateResponseStatus>;

/** The verdict each decision key hands down, `decide`-shaped. */
const KEY_DECISIONS: Record<
  string,
  { status: string; done: string; verb: string }
> = {
  a: { status: "APPROVED", done: "Approved", verb: "approve" },
  r: { status: "REJECTED", done: "Rejected", verb: "reject" },
};

/** Decision keys stay quiet while typing, holding a chord, or under a dialog. */
function canHandleDecisionKey(event: KeyboardEvent): boolean {
  if (isEditableTarget(event.target)) return false;
  if (event.metaKey || event.ctrlKey) return false;
  if (event.altKey) return false;
  return (
    document.querySelector('[role="dialog"], [role="alertdialog"]') === null
  );
}

/**
 * Decision shortcuts. `useListSelection` owns movement and selection; these
 * own the verdict, so a reviewer can clear a queue without opening a single
 * record.
 */
function useDecisionShortcuts({
  highlightedId,
  items,
  decide,
}: {
  highlightedId: string | null;
  items: readonly { id: string; reviewStatus: string }[];
  decide: Decide;
}) {
  React.useEffect(() => {
    const target = highlightedId;
    if (!target) return;

    const onKey = (event: KeyboardEvent) => {
      if (!canHandleDecisionKey(event)) return;
      const record = items.find((r) => r.id === target);
      if (!record || record.reviewStatus !== "PENDING") return;
      const decision = KEY_DECISIONS[event.key.toLowerCase()];
      if (!decision) return;
      event.preventDefault();
      decide(target, decision.status, decision.done, decision.verb);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, items, highlightedId]);
}

/**
 * The bulk bar only offers verdicts that can still change something on the
 * current view — no "Approve" while looking at the approved.
 */
function useBulkActions({
  filter,
  selection,
  statusMutation,
}: {
  filter: Filter;
  selection: ListSelection;
  statusMutation: StatusMutation;
}): BulkAction[] {
  const handleBulk = (status: string, done: string, verb: string) => {
    const targets = selection.selectedIds;
    if (targets.length === 0) return;
    void Promise.allSettled(
      targets.map((responseId) =>
        statusMutation.mutateAsync({ responseId, status }),
      ),
    ).then((results) => {
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) toast.success(`${done} ${targets.length}`);
      else if (failed === targets.length)
        toast.error(`Couldn't ${verb} any of them.`);
      else
        toast.warning(
          `${done} ${targets.length - failed} of ${targets.length}. ${failed} failed.`,
        );
      selection.clear();
    });
  };

  return React.useMemo(() => {
    const actions: BulkAction[] = [];
    if (filter !== "approved" && filter !== "featured") {
      actions.push({
        id: "approve",
        label: "Approve",
        onClick: () => handleBulk("APPROVED", "Approved", "approve"),
      });
    }
    if (filter !== "declined") {
      actions.push({
        id: "reject",
        label: "Reject",
        onClick: () => handleBulk("REJECTED", "Rejected", "reject"),
      });
    }
    actions.push({
      id: "archive",
      label: "Archive",
      tone: "destructive",
      onClick: () => handleBulk("ARCHIVED", "Archived", "archive"),
    });
    return actions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, selection.selectedIds]);
}

export function ResponsesList({ project }: { project: V2ProjectDTO }) {
  const router = useRouter();
  const { queue, setParams } = useQueueUrlState();
  const [searchDraft, setSearchDraft] = useSearchDraft(queue.search, setParams);

  const listQuery = useResponses(project.slug, listQueryParams(queue));
  const formsQuery = useFormsList(project.slug);
  const forms = formsQuery.data ?? [];

  const items = React.useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data],
  );
  const state = useDataState(listQuery, {
    count: items.length,
    filtered: hasActiveFilters(queue),
  });

  const statusMutation = useUpdateResponseStatus(project.slug);
  const busy = statusMutation.isPending;

  const open = React.useCallback(
    (responseId: string) => {
      router.push(responsePath(project.slug, responseId));
    },
    [project.slug, router],
  );

  const ids = React.useMemo(() => items.map((r) => r.id), [items]);
  const selection = useListSelection({ ids, onActivate: open });

  // Success speaks in the past tense ("Approved"), failure in the present
  // ("Couldn't approve it") — one label can't do both jobs.
  const decide = React.useCallback<Decide>(
    (responseId, status, done, verb) => {
      statusMutation.mutate(
        { responseId, status },
        {
          onSuccess: () => toast.success(done),
          onError: () => toast.error(`Couldn't ${verb} it.`),
        },
      );
    },
    [statusMutation],
  );

  useDecisionShortcuts({
    highlightedId: selection.highlightedId,
    items,
    decide,
  });

  const bulkActions = useBulkActions({
    filter: queue.filter,
    selection,
    statusMutation,
  });

  const total = listQuery.data?.total;
  const totalPages = listQuery.data?.totalPages ?? 1;

  const clearAllFilters = () => {
    setSearchDraft("");
    setParams({ status: null, q: null, form: null, source: null, page: null });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <QueueHeader
        project={project}
        total={total}
        loading={state.kind === "loading-initial"}
      />

      <QueueFilterBar
        queue={queue}
        forms={forms}
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        setParams={setParams}
      />

      <AutoModerationNotice project={project} />

      {/* ── The queue ── */}
      <PageBody padding="bare" className="flex min-h-0 flex-1 flex-col">
        <DataState
          state={state}
          resource="responses"
          align="center"
          className="min-h-0"
          skeleton={<QueueSkeleton />}
          empty={<FirstRunEmpty slug={project.slug} />}
          filteredEmpty={
            <FilteredEmpty
              filter={queue.filter}
              search={queue.search}
              onClear={clearAllFilters}
            />
          }
        >
          <QueueRows
            items={items}
            selection={selection}
            busy={busy}
            onOpen={open}
            decide={decide}
          />
        </DataState>

        {totalPages > 1 && (
          <QueuePager
            page={queue.page}
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
      </PageBody>
    </div>
  );
}

// ── Filter line ──────────────────────────────────────────────────────────────

/** One compact select in the filter line, writing a single URL param. */
function QueueSelect({
  value,
  options,
  collapse,
  param,
  ariaLabel,
  setParams,
}: {
  value: string;
  options: readonly { id: string; label: string }[];
  /** The default id stays out of the URL, so clean links stay clean. */
  collapse: string;
  param: string;
  ariaLabel: string;
  setParams: SetParams;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) =>
        setParams({ [param]: next === collapse ? null : next, page: null })
      }
    >
      <SelectTrigger size="sm" className="text-xs" aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Line 2 of the chrome: status pills, form, source, sort, search. */
function QueueFilterBar({
  queue,
  forms,
  searchDraft,
  onSearchDraftChange,
  setParams,
}: {
  queue: QueueParams;
  forms: readonly { id: string; name: string }[];
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  setParams: SetParams;
}) {
  const { filter, formId, source, sort } = queue;
  return (
    <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border px-4 py-1.5 sm:px-5">
      <div className="scrollbar-none min-w-0 flex-1 overflow-x-auto">
        <FilterPills
          options={FILTERS}
          value={filter}
          onChange={(next) => setParams({ status: next, page: null })}
          size="sm"
          aria-label="Filter responses"
        />
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {/* The form filter only exists once there is more than one form to
            tell apart — a select with a single real option is noise. It still
            renders while a form param is active, so a deep link can always be
            cleared. */}
        {(forms.length > 1 || formId !== "") && (
          <QueueSelect
            value={formId || "all"}
            options={[
              { id: "all", label: "All forms" },
              ...forms.map((form) => ({ id: form.id, label: form.name })),
            ]}
            collapse="all"
            param="form"
            ariaLabel="Filter by form"
            setParams={setParams}
          />
        )}
        <QueueSelect
          value={source}
          options={SOURCES}
          collapse="all"
          param="source"
          ariaLabel="Filter by source"
          setParams={setParams}
        />
        <QueueSelect
          value={sort}
          options={SORTS}
          collapse="newest"
          param="sort"
          ariaLabel="Sort"
          setParams={setParams}
        />
        <SearchField
          value={searchDraft}
          onChange={onSearchDraftChange}
          placeholder="Search people"
          ariaLabel="Search responses"
          width="fixed"
        />
      </div>
    </div>
  );
}

// ── Header pieces ────────────────────────────────────────────────────────────

/** Line 1 of the chrome: identity + count + secondary route in. */
function QueueHeader({
  project,
  total,
  loading,
}: {
  project: V2ProjectDTO;
  total: number | undefined;
  loading: boolean;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-5">
      <h1 className="text-sm font-semibold tracking-tight text-foreground">
        Responses
      </h1>
      <QueueCount project={project} total={total} loading={loading} />
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
  );
}

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
      <span className="min-w-0 flex-1">Automatic checks are off.</span>
      <Link
        href={settingsVisibilityPath(project.slug)}
        className="shrink-0 font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        Turn on
      </Link>
    </div>
  );
}

// ── List pieces ──────────────────────────────────────────────────────────────

type QueueResponse = React.ComponentProps<typeof ResponseQueueRow>["response"];

function QueueRows({
  items,
  selection,
  busy,
  onOpen,
  decide,
}: {
  items: readonly QueueResponse[];
  selection: ListSelection;
  busy: boolean;
  onOpen: (responseId: string) => void;
  decide: Decide;
}) {
  return (
    <div
      role="list"
      aria-label="Responses"
      className="min-h-0 flex-1 divide-y divide-border/70 overflow-y-auto"
    >
      {items.map((response) => (
        <ResponseQueueRow
          key={response.id}
          response={response}
          highlighted={selection.highlightedId === response.id}
          selected={selection.isSelected(response.id)}
          selectionActive={selection.count > 0}
          busy={busy}
          onOpen={() => onOpen(response.id)}
          onSelectToggle={(event) => {
            event.stopPropagation();
            selection.toggle(response.id, event.shiftKey);
          }}
          onApprove={() =>
            decide(response.id, "APPROVED", "Approved", "approve")
          }
          onReject={() => decide(response.id, "REJECTED", "Rejected", "reject")}
        />
      ))}
    </div>
  );
}

function QueueSkeleton() {
  const widths = ["w-24", "w-32", "w-20", "w-28", "w-24", "w-32"];
  return (
    <div aria-hidden className="divide-y divide-border/70">
      {widths.map((w, i) => (
        <div key={i} className="flex items-start gap-2.5 px-3 py-2.5">
          <span className="size-7 shrink-0 rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className={cn("animate-shimmer h-3", w)} />
            <Skeleton className="animate-shimmer h-2.5 w-full max-w-xl" />
            <Skeleton className="animate-shimmer h-2 w-2/5 max-w-xs" />
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

// ── Empty states ─────────────────────────────────────────────────────────────

function FirstRunEmpty({ slug }: { slug: string }) {
  return (
    <EmptyState
      icon={ChatCircleText}
      title="No responses yet"
      description="Testimonials land here as people submit your forms."
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
        description="New submissions land here as they arrive."
      />
    );
  }

  return (
    <NoResults
      title={`No ${label.toLowerCase()} responses`}
      description="Nothing here matches these filters yet."
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
