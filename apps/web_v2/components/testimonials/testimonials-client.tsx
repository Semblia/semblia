"use client";

import * as React from "react";
import Link from "next/link";
import {
  SearchIcon,
  XIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  ShieldCheckIcon,
  StarIcon,
  EyeIcon,
  EyeOffIcon,
  FilterIcon,
  ChevronDownIcon,
  MessageSquareTextIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import {
  apiGetTestimonials,
  apiApproveTestimonial,
  apiRejectTestimonial,
  apiPublishTestimonial,
  type PaginatedResponse,
  type TestimonialsFilter,
} from "@/lib/api";
import {
  timeAgo,
  type MockTestimonial,
  type ModerationStatus,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type StatusFilter = ModerationStatus | "ALL";
type SortOption = "newest" | "oldest" | "rating_desc" | "rating_asc";

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "FLAGGED", label: "Flagged" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "rating_desc", label: "Rating: high to low" },
  { key: "rating_asc", label: "Rating: low to high" },
];

const STATUS_CONFIG: Record<
  ModerationStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; pill: string }
> = {
  APPROVED: { label: "Approved", icon: CheckCircle2Icon, pill: "text-success bg-success/10" },
  PENDING: { label: "Pending", icon: ClockIcon, pill: "text-muted-foreground bg-muted" },
  FLAGGED: { label: "Flagged", icon: AlertTriangleIcon, pill: "text-warning bg-warning/12" },
  REJECTED: { label: "Rejected", icon: XCircleIcon, pill: "text-destructive bg-destructive/10" },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon
          key={i}
          className={cn(
            "size-2.5",
            i < rating ? "fill-warning text-warning" : "fill-muted text-muted"
          )}
        />
      ))}
    </span>
  );
}

function StatusPill({ status }: { status: ModerationStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        cfg.pill
      )}
    >
      <cfg.icon className="size-3 shrink-0" />
      {cfg.label}
    </span>
  );
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function TestimonialSkeleton() {
  return (
    <div className="flex gap-3 px-6 py-4">
      <Skeleton className="mt-0.5 size-8 shrink-0 rounded-full animate-shimmer" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-28 animate-shimmer" />
          <Skeleton className="h-3 w-20 animate-shimmer" />
        </div>
        <Skeleton className="h-3 w-full animate-shimmer" />
        <Skeleton className="h-3 w-3/4 animate-shimmer" />
        <div className="flex items-center gap-3 pt-0.5">
          <Skeleton className="h-4 w-14 rounded-full animate-shimmer" />
          <Skeleton className="h-4 w-16 rounded-full animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

// ── Testimonial row ───────────────────────────────────────────────────────────

interface TestimonialRowProps {
  t: MockTestimonial;
  projectSlug: string;
  index: number;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onTogglePublish: (id: string, published: boolean) => void;
  pending: Set<string>;
}

function TestimonialRow({
  t,
  projectSlug,
  index,
  onApprove,
  onReject,
  onTogglePublish,
  pending,
}: TestimonialRowProps) {
  const isBusy = pending.has(t.id);
  const isActionable = t.moderationStatus === "PENDING" || t.moderationStatus === "FLAGGED";

  return (
    <div
      className="group flex gap-3 border-b border-border px-6 py-4 last:border-0 animate-fade-up"
      style={{ animationDelay: `${index * 45}ms`, animationFillMode: "both" }}
    >
      {/* Author avatar */}
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground select-none">
        {t.authorName[0].toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-xs font-semibold text-foreground">
            {t.authorName}
          </span>
          {(t.authorRole || t.authorCompany) && (
            <span className="text-xs text-muted-foreground">
              {[t.authorRole, t.authorCompany].filter(Boolean).join(", ")}
            </span>
          )}
          {t.isOAuthVerified && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-medium text-success"
              aria-label={`Verified via ${t.oauthProvider}`}
            >
              <ShieldCheckIcon className="size-3" />
              Verified
            </span>
          )}
        </div>

        {/* Content */}
        <Link
          href={`/projects/${projectSlug}/testimonials/${t.id}`}
          className="mt-1 block"
        >
          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2 transition-colors hover:text-foreground">
            {t.content}
          </p>
        </Link>

        {/* Meta row */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Stars rating={t.rating} />
          <StatusPill status={t.moderationStatus} />

          <span
            className={cn(
              "flex items-center gap-1 text-[10px]",
              t.isPublished ? "text-success" : "text-muted-foreground"
            )}
          >
            {t.isPublished ? (
              <EyeIcon className="size-3" />
            ) : (
              <EyeOffIcon className="size-3" />
            )}
            {t.isPublished ? "Published" : "Unpublished"}
          </span>

          {t.tags.length > 0 && (
            <div className="flex items-center gap-1">
              {t.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  className="rounded bg-brand-muted px-1.5 py-0.5 text-[10px] font-medium text-brand"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
            {timeAgo(t.createdAt)}
          </span>
        </div>

        {/* Inline moderation actions */}
        {isActionable && (
          <div className="mt-2.5 flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              className="gap-1 text-success hover:bg-success/10 hover:text-success hover:border-success/30 active:scale-[0.98]"
              disabled={isBusy}
              onClick={() => onApprove(t.id)}
            >
              <CheckCircle2Icon className="size-3" />
              Approve
            </Button>
            <Button
              size="xs"
              variant="outline"
              className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 active:scale-[0.98]"
              disabled={isBusy}
              onClick={() => onReject(t.id)}
            >
              <XCircleIcon className="size-3" />
              Reject
            </Button>
            {t.moderationStatus === "FLAGGED" && (
              <Button
                size="xs"
                variant="ghost"
                className="gap-1 text-muted-foreground hover:text-foreground"
                disabled={isBusy}
                onClick={() => onTogglePublish(t.id, !t.isPublished)}
              >
                {t.isPublished ? (
                  <>
                    <EyeOffIcon className="size-3" />
                    Unpublish
                  </>
                ) : (
                  <>
                    <EyeIcon className="size-3" />
                    Publish anyway
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: StatusFilter }) {
  const messages: Record<StatusFilter, { title: string; desc: string }> = {
    ALL: {
      title: "No testimonials yet",
      desc: "Share your collection link to start gathering testimonials.",
    },
    PENDING: {
      title: "Nothing pending",
      desc: "All testimonials have been reviewed.",
    },
    FLAGGED: {
      title: "No flagged items",
      desc: "Auto-moderation has not flagged anything recently.",
    },
    APPROVED: {
      title: "No approved testimonials",
      desc: "Approve testimonials to publish them to your widgets.",
    },
    REJECTED: {
      title: "No rejected testimonials",
      desc: "Rejected testimonials will appear here.",
    },
  };

  const { title, desc } = messages[filter];

  return (
    <div className="flex flex-col items-center py-20 px-6 text-center animate-fade-up">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-muted">
        <MessageSquareTextIcon className="size-4 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-muted-foreground">
        {desc}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  projectSlug: string;
}

export function TestimonialsClient({ projectId, projectSlug }: Props) {
  const [status, setStatus] = React.useState<StatusFilter>("ALL");
  const [sort, setSort] = React.useState<SortOption>("newest");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const [loading, setLoading] = React.useState(true);
  const [result, setResult] = React.useState<PaginatedResponse<MockTestimonial> | null>(null);

  // Optimistic local overrides: id → new status
  const [statusOverrides, setStatusOverrides] = React.useState<
    Map<string, ModerationStatus>
  >(new Map());
  const [publishOverrides, setPublishOverrides] = React.useState<
    Map<string, boolean>
  >(new Map());
  const [pendingActions, setPendingActions] = React.useState<Set<string>>(
    new Set()
  );

  const debouncedSearch = useDebounce(search, 300);

  React.useEffect(() => {
    setPage(1);
  }, [status, sort, debouncedSearch]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    apiGetTestimonials(projectId, {
      status,
      sort,
      search: debouncedSearch,
      page,
      pageSize: 8,
    }).then((data) => {
      if (!cancelled) {
        setResult(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [projectId, status, sort, debouncedSearch, page]);

  // Optimistic approve
  const handleApprove = React.useCallback(
    (id: string) => {
      setPendingActions((prev) => new Set(prev).add(id));
      setStatusOverrides((prev) => new Map(prev).set(id, "APPROVED"));

      apiApproveTestimonial(id).finally(() => {
        setPendingActions((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
    },
    []
  );

  // Optimistic reject
  const handleReject = React.useCallback(
    (id: string) => {
      setPendingActions((prev) => new Set(prev).add(id));
      setStatusOverrides((prev) => new Map(prev).set(id, "REJECTED"));

      apiRejectTestimonial(id).finally(() => {
        setPendingActions((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
    },
    []
  );

  // Optimistic publish toggle
  const handleTogglePublish = React.useCallback(
    (id: string, published: boolean) => {
      setPendingActions((prev) => new Set(prev).add(id));
      setPublishOverrides((prev) => new Map(prev).set(id, published));

      apiPublishTestimonial(id, published).finally(() => {
        setPendingActions((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
    },
    []
  );

  // Apply overrides to the items
  const items = React.useMemo(() => {
    if (!result) return [];
    return result.items.map((t) => ({
      ...t,
      moderationStatus: statusOverrides.get(t.id) ?? t.moderationStatus,
      isPublished: publishOverrides.has(t.id)
        ? publishOverrides.get(t.id)!
        : t.isPublished,
    }));
  }, [result, statusOverrides, publishOverrides]);

  const sortLabel =
    SORT_OPTIONS.find((o) => o.key === sort)?.label ?? "Sort";

  return (
    <div className="flex flex-col min-h-[100dvh]">
      {/* ── Filter + search bar ── */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        {/* Status tabs */}
        <div className="flex items-center gap-0 overflow-x-auto px-6 scrollbar-none">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatus(tab.key)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-3 text-xs font-medium transition-colors duration-150",
                status === tab.key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              aria-current={status === tab.key ? "page" : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + sort row */}
        <div className="flex items-center gap-3 border-t border-border px-6 py-2.5">
          <div className="relative flex-1 max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search testimonials\u2026"
              className="h-7 pl-8 text-xs"
              aria-label="Search testimonials"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <XIcon className="size-3" />
              </button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="xs" className="gap-1.5 text-muted-foreground">
                <FilterIcon className="size-3 shrink-0" />
                {sortLabel}
                <ChevronDownIcon className="size-3 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {SORT_OPTIONS.map((o) => (
                <DropdownMenuItem
                  key={o.key}
                  onSelect={() => setSort(o.key)}
                  className="gap-2 text-xs"
                >
                  {o.label}
                  {sort === o.key && (
                    <span className="ml-auto size-1.5 shrink-0 rounded-full bg-brand" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {result && (
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {result.total} {result.total === 1 ? "result" : "results"}
            </span>
          )}
        </div>
      </div>

      {/* ── List ── */}
      <main className="flex-1">
        {loading ? (
          <div>
            {[0, 1, 2, 3].map((i) => (
              <TestimonialSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState filter={status} />
        ) : (
          <div>
            {items.map((t, i) => (
              <TestimonialRow
                key={t.id}
                t={t}
                projectSlug={projectSlug}
                index={i}
                onApprove={handleApprove}
                onReject={handleReject}
                onTogglePublish={handleTogglePublish}
                pending={pendingActions}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Pagination ── */}
      {result && result.totalPages > 1 && (
        <div className="border-t border-border px-6 py-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-disabled={!result.hasPrev}
                  className={cn(!result.hasPrev && "pointer-events-none opacity-40")}
                />
              </PaginationItem>

              {buildPageNumbers(result.page, result.totalPages).map((item, i) =>
                item === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={item}>
                    <PaginationLink
                      isActive={item === result.page}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setPage((p) => Math.min(result.totalPages, p + 1))
                  }
                  aria-disabled={!result.hasNext}
                  className={cn(!result.hasNext && "pointer-events-none opacity-40")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPageNumbers(
  current: number,
  total: number
): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) pages.push("ellipsis");

  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);

  return pages;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
