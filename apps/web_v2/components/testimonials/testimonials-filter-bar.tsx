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
import {
  PageToolbar,
  RefreshingDataBadge,
  SearchField,
} from "@/components/shared";
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
  sort: SortOption;
  setSort: (s: SortOption) => void;
  search: string;
  setSearch: (s: string) => void;
  result: PaginatedResponse<MockTestimonial> | null;
  hasActionable: boolean;
  bulkMode: boolean;
  refreshing?: boolean;
  onSelectAll: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function TestimonialsFilterBar({
  sort,
  setSort,
  search,
  setSearch,
  result,
  hasActionable,
  bulkMode,
  refreshing,
  onSelectAll,
}: FilterBarProps) {
  const sortLabel = SORT_OPTIONS.find((o) => o.key === sort)?.label ?? "Sort";

  return (
    <PageToolbar
      stickyTop="0"
      leading={
        <>
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
        </>
      }
      trailing={
        result || refreshing ? (
          <>
            <RefreshingDataBadge show={refreshing} />
            {result && (
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {result.total} {result.total === 1 ? "result" : "results"}
              </span>
            )}
          </>
        ) : undefined
      }
    />
  );
}
