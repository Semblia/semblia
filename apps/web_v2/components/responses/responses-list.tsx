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
import { useListSelection } from "@/hooks/use-list-selection";
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
  const formId = searchParams.get("form") ?? "";
  const rawSource = (searchParams.get("source") ?? "all") as Source;
  const source: Source = SOURCES.some((s) => s.id === rawSource)
    ? rawSource
    : "all";
  const rawSort = (searchParams.get("sort") ?? "newest") as Sort;
  const sort: Sort = SORTS.some((s) => s.id === rawSort) ? rawSort : "newest";

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
    formId: formId || undefined,
    origin: SOURCES.find((s) => s.id === source)?.origin,
    search: search || undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  // The form filter only exists once there is more than one form to tell
  // apart — a select with a single real option is noise. It still renders
  // while a form param is active, so a deep link can always be cleared.
  const formsQuery = useFormsList(project.slug);
  const forms = formsQuery.data ?? [];

  const items = React.useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data],
  );
  const filtered =
    filter !== "all" || search.length > 0 || formId !== "" || source !== "all";
  const state = useDataState(listQuery, { count: items.length, filtered });

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

  // ── Decisions ───────────────────────────────────────────────────────────

  // Success speaks in the past tense ("Approved"), failure in the present
  // ("Couldn't approve it") — one label can't do both jobs.
  const decide = React.useCallback(
    (responseId: string, status: string, done: string, verb: string) => {
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

  // ── Decision shortcuts ──────────────────────────────────────────────────
  // `useListSelection` owns movement and selection; these own the verdict, so
  // a reviewer can clear a queue without opening a single record.
  React.useEffect(() => {
    const target = selection.highlightedId;
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
        decide(target, "APPROVED", "Approved", "approve");
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        decide(target, "REJECTED", "Rejected", "reject");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, items, selection.highlightedId]);

  const bulkActions: BulkAction[] = React.useMemo(() => {
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

  const total = listQuery.data?.total;
  const totalPages = listQuery.data?.totalPages ?? 1;

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

      {/* ── Line 2: filters + sort + search ── */}
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
          {(forms.length > 1 || formId !== "") && (
            <Select
              value={formId || "all"}
              onValueChange={(next) =>
                setParams({ form: next === "all" ? null : next, page: null })
              }
            >
              <SelectTrigger
                size="sm"
                className="text-xs"
                aria-label="Filter by form"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All forms</SelectItem>
                {forms.map((form) => (
                  <SelectItem key={form.id} value={form.id}>
                    {form.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select
            value={source}
            onValueChange={(next) =>
              setParams({ source: next === "all" ? null : next, page: null })
            }
          >
            <SelectTrigger
              size="sm"
              className="text-xs"
              aria-label="Filter by source"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(next) =>
              setParams({ sort: next === "newest" ? null : next, page: null })
            }
          >
            <SelectTrigger size="sm" className="text-xs" aria-label="Sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              filter={filter}
              search={search}
              onClear={() => {
                setSearchDraft("");
                setParams({
                  status: null,
                  q: null,
                  form: null,
                  source: null,
                  page: null,
                });
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
                highlighted={selection.highlightedId === response.id}
                selected={selection.isSelected(response.id)}
                selectionActive={selection.count > 0}
                busy={busy}
                onOpen={() => open(response.id)}
                onSelectToggle={(event) => {
                  event.stopPropagation();
                  selection.toggle(response.id, event.shiftKey);
                }}
                onApprove={() => decide(response.id, "APPROVED", "Approved", "approve")}
                onReject={() => decide(response.id, "REJECTED", "Rejected", "reject")}
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
