"use client";

import {
  SquaresFour as LayoutGridIcon,
  ListBullets as LayoutListIcon,
} from "@phosphor-icons/react";
import {
  PageToolbar,
  SearchField,
  FilterPills,
} from "@/components/shared";

// ── Search + view toggle bar ───────────────────────────────────────────────────

export function ProjectsToolbar({
  search,
  onSearchChange,
  view,
  onViewChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  view: "list" | "card";
  onViewChange: (view: "list" | "card") => void;
}) {
  return (
    <PageToolbar
      leading={
        <SearchField
          value={search}
          onChange={onSearchChange}
          placeholder="Search projects…"
          ariaLabel="Search projects"
        />
      }
      trailing={
        <FilterPills<"list" | "card">
          aria-label="View toggle"
          size="sm"
          options={[
            { id: "list", label: "List", icon: LayoutListIcon },
            { id: "card", label: "Card", icon: LayoutGridIcon },
          ]}
          value={view}
          onChange={onViewChange}
        />
      }
    />
  );
}
