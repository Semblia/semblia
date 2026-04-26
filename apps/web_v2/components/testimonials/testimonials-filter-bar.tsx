"use client";

import * as React from "react";
import {
  Funnel as FilterIcon,
  CaretDown as ChevronDownIcon,
  Check as CheckIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterPills, SearchField } from "@/components/shared";
import { type ModerationStatus } from "@/lib/mock-data";
import type { PaginatedResponse } from "@/lib/api";
import type { MockTestimonial } from "@/lib/mock-data";

// ── Types ────────────────────────────────────────────────────────────────────

export type StatusFilter = ModerationStatus | "ALL";
export type SortOption = "newest" | "oldest" | "rating_desc" | "rating_asc";

// ── Config ───────────────────────────────────────────────────────────────────

export const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "FLAGGED", label: "Flagged" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

export const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "rating_desc", label: "Rating: high to low" },
  { key: "rating_asc", label: "Rating: low to high" },
];

// ── Props ────────────────────────────────────────────────────────────────────

interface FilterBarProps {
  status: StatusFilter;
  setStatus: (s: StatusFilter) => void;
  sort: SortOption;
  setSort: (s: SortOption) => void;
  search: string;
  setSearch: (s: string) => void;
  result: PaginatedResponse<MockTestimonial> | null;
  hasActionable: boolean;
  bulkMode: boolean;
  onSelectAll: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function TestimonialsFilterBar({
  status,
  setStatus,
  sort,
  setSort,
  search,
  setSearch,
  result,
  hasActionable,
  bulkMode,
  onSelectAll,
}: FilterBarProps) {
  const sortLabel =
    SORT_OPTIONS.find((o) => o.key === sort)?.label ?? "Sort";

  return (
    <div className="sticky top-14 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
      {/* Status tabs */}
      <div className="px-4 sm:px-6">
        <FilterPills<StatusFilter>
          variant="tabs"
          aria-label="Filter testimonials by status"
          options={STATUS_TABS.map((t) => ({ id: t.key, label: t.label }))}
          value={status}
          onChange={setStatus}
        />
      </div>

      {/* Search + sort row */}
      <div className="flex items-center gap-3 border-t border-border px-4 py-2.5 sm:px-6">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search testimonials…"
          ariaLabel="Search testimonials"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="xs"
              className="gap-1.5 text-muted-foreground"
            >
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

        {hasActionable && !bulkMode && (
          <Button
            variant="ghost"
            size="xs"
            className="gap-1 text-muted-foreground"
            onClick={onSelectAll}
          >
            <CheckIcon className="size-3" />
            Select
          </Button>
        )}

        {result && (
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {result.total} {result.total === 1 ? "result" : "results"}
          </span>
        )}
      </div>
    </div>
  );
}
