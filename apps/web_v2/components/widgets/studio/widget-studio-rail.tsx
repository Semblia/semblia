"use client";

/**
 * WidgetStudioRail — slim left rail of sibling widgets in this project.
 *
 * Each item is a 40×40 mini-preview thumbnail with a type icon overlay,
 * showing the active state with the brand-colored left bar (matching the
 * project sidebar pattern). Clicking navigates to the sibling widget;
 * unsaved-changes navigation guard is handled by the shell, not the rail.
 */

import * as React from "react";
import Link from "next/link";
import {
  Plus as PlusIcon,
  Globe as GlobeIcon,
  Code as CodeIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import type {
  WidgetListEntry,
  WidgetStudioConfig,
} from "@/lib/widgets/widget-types";
import { WidgetCardMiniPreview } from "../widget-card-mini-preview";

interface WidgetStudioRailProps {
  slug: string;
  activeId: string;
  entries: WidgetListEntry[];
  /** widgetId → snapshot draft, for live thumbnail. */
  configs: Record<string, WidgetStudioConfig>;
  items: WidgetTestimonial[];
  onNavigate: (widgetId: string) => void;
  onCreate: () => void;
}

export function WidgetStudioRail({
  slug,
  activeId,
  entries,
  configs,
  items,
  onNavigate,
  onCreate,
}: WidgetStudioRailProps) {
  return (
    <aside
      className="flex h-full w-14 shrink-0 flex-col items-center gap-1 border-r border-border/60 bg-sidebar py-2"
      aria-label="Widget switcher"
    >
      <ul className="flex flex-1 flex-col items-center gap-1.5 overflow-y-auto py-1">
        {entries.map((entry) => {
          const cfg = configs[entry.id];
          if (!cfg) return null;
          const active = entry.id === activeId;
          return (
            <li key={entry.id}>
              <RailItem
                slug={slug}
                entry={entry}
                config={cfg}
                items={items}
                active={active}
                onClick={() => onNavigate(entry.id)}
              />
            </li>
          );
        })}
      </ul>

      <div className="my-1 h-px w-7 bg-border/60" aria-hidden />

      <button
        type="button"
        onClick={onCreate}
        className={cn(
          "group flex size-9 items-center justify-center rounded-md text-muted-foreground",
          "transition-[background,color,transform] duration-150",
          "hover:bg-muted hover:text-foreground active:scale-[0.96]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        )}
        aria-label="Create new widget"
      >
        <PlusIcon className="size-4" weight="bold" aria-hidden />
      </button>
    </aside>
  );
}

interface RailItemProps {
  slug: string;
  entry: WidgetListEntry;
  config: WidgetStudioConfig;
  items: WidgetTestimonial[];
  active: boolean;
  onClick: () => void;
}

const RailItem = React.memo(function RailItem({
  slug,
  entry,
  config,
  items,
  active,
  onClick,
}: RailItemProps) {
  const isWall = entry.kind === "wall";
  return (
    <Link
      href={`/projects/${slug}/widgets/${entry.id}`}
      onClick={(e) => {
        // Let parent intercept for the unsaved-changes guard.
        e.preventDefault();
        onClick();
      }}
      aria-current={active ? "page" : undefined}
      title={`${entry.name} (${isWall ? "Wall" : "Embed"})`}
      className={cn(
        "group relative flex size-9 items-center justify-center overflow-hidden rounded-md",
        "transition-[transform,box-shadow] duration-150 ease-out",
        "hover:-translate-y-px",
        active
          ? "ring-1 ring-foreground/35"
          : "ring-1 ring-border/60 hover:ring-foreground/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {/* Brand active bar */}
      {active && (
        <span
          className="absolute -left-2 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-brand"
          aria-hidden
        />
      )}

      {/* Mini preview */}
      <span className="absolute inset-0">
        <WidgetCardMiniPreview
          config={config}
          items={items}
          padding={4}
          ariaLabel={entry.name}
        />
      </span>

      {/* Type icon overlay */}
      <span
        className={cn(
          "absolute bottom-0.5 right-0.5 inline-flex items-center justify-center rounded-sm p-0.5",
          isWall
            ? "bg-brand text-background"
            : "bg-foreground/80 text-background",
        )}
        aria-hidden
      >
        {isWall ? (
          <GlobeIcon className="size-2.5" weight="bold" />
        ) : (
          <CodeIcon className="size-2.5" weight="bold" />
        )}
      </span>

      {/* Inactive overlay */}
      {!entry.isActive && (
        <span className="absolute inset-0 bg-foreground/15" aria-hidden />
      )}
    </Link>
  );
});
