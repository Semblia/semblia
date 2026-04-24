"use client";

import * as React from "react";
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
  type PaginatedResponse,
} from "@/lib/api";
import { type MockTestimonial } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { buildPageNumbers } from "@/lib/pagination";
import { TestimonialRow } from "./testimonial-row";
import { TestimonialSkeleton } from "./testimonial-skeleton";
import { TestimonialEmptyState } from "./testimonial-empty-state";
import { BulkToolbar } from "./bulk-toolbar";
import {
  TestimonialsFilterBar,
  type StatusFilter,
  type SortOption,
} from "./testimonials-filter-bar";

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onInlineApprove?: (id: string) => void;
  onInlineReject?: (id: string) => void;
  onItemsChange?: (ids: string[]) => void;
}

export function TestimonialsClient({
  projectId,
  selectedId,
  onSelect,
  onInlineApprove,
  onInlineReject,
  onItemsChange,
}: Props) {
  const [status, setStatus] = React.useState<StatusFilter>("ALL");
  const [sort, setSort] = React.useState<SortOption>("newest");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const [loading, setLoading] = React.useState(true);
  const [result, setResult] =
    React.useState<PaginatedResponse<MockTestimonial> | null>(null);

  const [bulkSelected, setBulkSelected] = React.useState<Set<string>>(
    new Set(),
  );
  const bulkMode = bulkSelected.size > 0;

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

  const items = React.useMemo(() => result?.items ?? [], [result]);

  React.useEffect(() => {
    onItemsChange?.(items.map((t) => t.id));
  }, [items, onItemsChange]);

  const handleBulkToggle = React.useCallback((id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkApprove = React.useCallback(() => {
    bulkSelected.forEach((id) => {
      apiApproveTestimonial(id);
      onInlineApprove?.(id);
    });
    setBulkSelected(new Set());
  }, [bulkSelected, onInlineApprove]);

  const handleBulkReject = React.useCallback(() => {
    bulkSelected.forEach((id) => {
      apiRejectTestimonial(id);
      onInlineReject?.(id);
    });
    setBulkSelected(new Set());
  }, [bulkSelected, onInlineReject]);

  const handleBulkCancel = React.useCallback(() => {
    setBulkSelected(new Set());
  }, []);

  const handleSelectAll = React.useCallback(() => {
    const actionable = items.filter(
      (t) =>
        t.moderationStatus === "PENDING" || t.moderationStatus === "FLAGGED",
    );
    const allSelected = actionable.every((t) => bulkSelected.has(t.id));
    if (allSelected) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(actionable.map((t) => t.id)));
    }
  }, [items, bulkSelected]);

  const hasActionable = items.some(
    (t) => t.moderationStatus === "PENDING" || t.moderationStatus === "FLAGGED",
  );

  return (
    <div className="flex flex-1 flex-col">
      <TestimonialsFilterBar
        status={status}
        setStatus={setStatus}
        sort={sort}
        setSort={setSort}
        search={search}
        setSearch={setSearch}
        result={result}
        hasActionable={hasActionable}
        bulkMode={bulkMode}
        onSelectAll={handleSelectAll}
      />

      {bulkMode && (
        <BulkToolbar
          count={bulkSelected.size}
          onApproveAll={handleBulkApprove}
          onRejectAll={handleBulkReject}
          onCancel={handleBulkCancel}
        />
      )}

      <main className="flex-1">
        {loading ? (
          <div className="divide-y divide-border/60">
            {[0, 1, 2, 3, 4].map((i) => (
              <TestimonialSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <TestimonialEmptyState filter={status} />
        ) : (
          <div className="divide-y divide-border/60 list-content-enter">
            {items.map((t) => (
              <TestimonialRow
                key={t.id}
                t={t}
                isSelected={selectedId === t.id}
                isBulkSelected={bulkSelected.has(t.id)}
                bulkMode={bulkMode}
                onSelect={onSelect}
                onBulkToggle={handleBulkToggle}
                onInlineApprove={onInlineApprove}
                onInlineReject={onInlineReject}
              />
            ))}
          </div>
        )}
      </main>

      {result && result.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <span className="text-xs text-muted-foreground">
            Page {result.page} of {result.totalPages}
          </span>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-disabled={!result.hasPrev}
                  className={cn(
                    !result.hasPrev && "pointer-events-none opacity-40",
                  )}
                />
              </PaginationItem>

              {buildPageNumbers(result.page, result.totalPages).map(
                (item, i) =>
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
                  ),
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setPage((p) => Math.min(result.totalPages, p + 1))
                  }
                  aria-disabled={!result.hasNext}
                  className={cn(
                    !result.hasNext && "pointer-events-none opacity-40",
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
