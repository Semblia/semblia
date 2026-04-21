"use client";

import {
  SquaresFour as LayoutGridIcon,
  ListBullets as LayoutListIcon,
  MagnifyingGlass as SearchIcon,
  X as XIcon,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
    <div className="sticky top-14 z-10 flex items-center gap-3 border-y border-border bg-background/85 px-6 py-2.5 backdrop-blur-md">
      <div className="relative flex-1 max-w-xs">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search projects…"
          className="h-7 pl-8 text-xs"
          aria-label="Search projects"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <XIcon className="size-3" />
          </button>
        )}
      </div>

      <div
        role="group"
        aria-label="View toggle"
        className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5"
      >
        <button
          aria-pressed={view === "list"}
          onClick={() => onViewChange("list")}
          className={cn(
            "flex size-6 items-center justify-center rounded-md transition-colors duration-150",
            view === "list"
              ? "bg-background text-foreground shadow-[0_1px_2px_oklch(0_0_0/8%)]"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="List view"
        >
          <LayoutListIcon className="size-3.5" />
        </button>
        <button
          aria-pressed={view === "card"}
          onClick={() => onViewChange("card")}
          className={cn(
            "flex size-6 items-center justify-center rounded-md transition-colors duration-150",
            view === "card"
              ? "bg-background text-foreground shadow-[0_1px_2px_oklch(0_0_0/8%)]"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="Card view"
        >
          <LayoutGridIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
