"use client";

import {
  PageToolbar,
  SearchField,
  ViewToggle,
  type ViewMode,
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
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
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
        <ViewToggle value={view} onChange={onViewChange} />
      }
    />
  );
}
