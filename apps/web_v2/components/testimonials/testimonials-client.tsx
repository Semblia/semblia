"use client";

import * as React from "react";
import {
  CaretLeft as ChevronLeftIcon,
  CaretRight as ChevronRightIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

import {
  apiGetTestimonials,
  apiApproveTestimonial,
  apiRejectTestimonial,
  type PaginatedResponse,
} from "@/lib/api";
import { type MockTestimonial } from "@/lib/mock-data";
import { PageBody } from "@/components/shared";
import { useDebounce } from "@/hooks/use-debounce";
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
  projectSlug?: string;
  /** Public hosted collection URL — used by the empty-state hero. */
  collectionUrl?: string;
  status: StatusFilter;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onInlineApprove?: (id: string) => void;
  onInlineReject?: (id: string) => void;
  onItemsChange?: (ids: string[]) => void;
}

export function TestimonialsClient({
  projectId,
  projectSlug,
  collectionUrl,
  status,
  selectedId,
  onSelect,
  onInlineApprove,
  onInlineReject,
  onItemsChange,
}: Props) {
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

      <PageBody padding="bare" className="flex-1">
        {loading ? (
          <div className="divide-y divide-border">
            {[0, 1, 2, 3, 4].map((i) => (
              <TestimonialSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <TestimonialEmptyState
            filter={status}
            collectionUrl={collectionUrl}
            projectSlug={projectSlug}
          />
        ) : (
          <div className="divide-y divide-border list-content-enter">
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
      </PageBody>

      {result && result.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 sm:px-6">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            Page {result.page} of {result.totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!result.hasPrev}
              aria-label="Previous page"
              className="size-7"
            >
              <ChevronLeftIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
              disabled={!result.hasNext}
              aria-label="Next page"
              className="size-7"
            >
              <ChevronRightIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
