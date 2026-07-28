"use client";

/**
 * WidgetCard — one widget as a gallery tile.
 *
 * The tile *is* the entity, which is the sanctioned case for a bordered
 * container, so this keeps its border. What it no longer keeps is anything
 * bordered inside it:
 *
 *   • the hover "Open" chip carried its own border and a `shadow-sm` on a
 *     surface that scrolls with the page — two rules at once, for an
 *     affordance the whole preview already is (it's a link)
 *   • the three-bar theme strip decorated the preview with the theme and the
 *     accent, both of which the preview itself shows and the meta line names
 *   • the wall address was a nested button whose only job duplicated the
 *     action row's copy action
 *
 * Status is one `StatusBadge` on the canonical vocabulary. Paused tiles also
 * fade, but the badge is the thing that is read.
 */

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { fmtCount, fmtDateTime } from "@/lib/format";
import { widgetStudioPath } from "@/lib/routes";
import type {
  WidgetListEntry,
  WidgetStudioConfig,
} from "@/lib/widgets/widget-types";
import { InlineName } from "@/components/studio/inline-name";
import { ItemCard, ItemActionRow, StatusBadge } from "@/components/shared";
import {
  kindMeta,
  lastLoadLabel,
  layoutLabel,
  themeMeta,
  useWidgetActions,
  widgetStatusMeta,
  widgetWallUrl,
} from "./widget-item";
import { WidgetPreviewPane } from "./widget-preview-pane";

interface WidgetCardProps {
  slug: string;
  entry: WidgetListEntry;
  /** The widget's parsed config. Absent when its saved config didn't parse. */
  previewConfig?: WidgetStudioConfig;
  /** Public wall slug from that config; `null` for embeds and unset walls. */
  wallSlug: string | null;
  /** A write is in flight somewhere in the list. */
  busy?: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onRename: (next: string) => void;
}

export const WidgetCard = React.memo(function WidgetCard({
  slug,
  entry,
  previewConfig,
  wallSlug,
  busy,
  onDuplicate,
  onDelete,
  onToggleActive,
  onRename,
}: WidgetCardProps) {
  const { actions, deleteDialog } = useWidgetActions({
    slug,
    entry,
    wallSlug,
    busy,
    onDuplicate,
    onDelete,
    onToggleActive,
  });

  const kind = kindMeta(entry.kind);
  const KindIcon = kind.icon;
  const theme = themeMeta(entry.theme);
  const status = widgetStatusMeta(entry.isActive);
  const address = widgetWallUrl(entry, wallSlug);
  const { totalLoads, lastLoadAt } = entry.metrics;

  return (
    <ItemCard
      inactive={!entry.isActive}
      data-testid="widget-card"
      aria-label={`${entry.name} — ${kind.label}, ${layoutLabel(entry.layout)}`}
      className={cn(!entry.isActive && "border-dashed border-border/70")}
    >
      {/* The preview is the affordance: the whole pane routes to the studio. */}
      <Link
        href={widgetStudioPath(slug, entry.id)}
        prefetch
        aria-label={`Edit ${entry.name}`}
        className="relative block aspect-[16/10] overflow-hidden bg-muted/30 outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <WidgetPreviewPane
          entry={entry}
          previewConfig={previewConfig}
          className="absolute inset-0"
        />
      </Link>

      <div className="flex flex-1 flex-col px-3.5 pb-3 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* The list doesn't fetch drafts, so it never claims one is dirty. */}
            <InlineName
              value={entry.name}
              muted={!entry.isActive}
              dirty={false}
              onCommit={onRename}
            />
            {address && (
              <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                {address}
              </p>
            )}
          </div>
          <StatusBadge {...status} className="mt-0.5 shrink-0" />
        </div>

        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          <KindIcon className="size-3 shrink-0" weight="bold" aria-hidden />
          <span className="truncate">
            {kind.label} · {layoutLabel(entry.layout)} · {theme.label}
          </span>
        </p>

        {/* A real zero is a fact: `0 loads`, never a suppressed or dashed one. */}
        <p className="mt-1.5 text-[11px] tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">
            {fmtCount(totalLoads)}
          </span>{" "}
          {totalLoads === 1 ? "load" : "loads"}
          <span className="mx-1.5 text-border" aria-hidden>
            ·
          </span>
          <span
            title={
              lastLoadAt === null
                ? undefined
                : fmtDateTime(new Date(lastLoadAt))
            }
          >
            {lastLoadLabel(lastLoadAt)}
          </span>
        </p>

        <ItemActionRow
          actions={actions}
          collapseUnder={340}
          visibleWhenCollapsed={2}
          className="mt-auto border-t border-border/60 pt-2"
        />
      </div>

      {deleteDialog}
    </ItemCard>
  );
});
