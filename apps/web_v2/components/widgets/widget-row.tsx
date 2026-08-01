"use client";

/**
 * WidgetRow — one widget in the dense list view.
 *
 * Built on `ItemRow`, preview-led: the row leads with a live mini render of
 * the widget at a fixed thumbnail size (h-20 w-32) — the same size
 * `ListSkeleton leading="preview"` reserves, so a cold load shifts nothing.
 * The thumbnail routes to the studio, the same affordance the grid tile's
 * preview pane carries.
 *
 * Row anatomy, identical wherever a widget appears:
 *   [preview] name             loads · last load     one badge     edited
 *             embed · carousel · light               [actions]
 */

import * as React from "react";
import Link from "next/link";
import { fmtCount, fmtDateTime, timeAgo } from "@/lib/format";
import { widgetStudioPath } from "@/lib/routes";
import type {
  WidgetListEntry,
  WidgetStudioConfig,
} from "@/lib/widgets/widget-types";
import { InlineName } from "@/components/studio/inline-name";
import { ItemRow, ItemActionRow, StatusBadge } from "@/components/shared";
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

interface WidgetRowProps {
  slug: string;
  entry: WidgetListEntry;
  /** The widget's parsed config. Absent when its saved config didn't parse. */
  previewConfig?: WidgetStudioConfig;
  /** Public wall slug from the widget's config; `null` for embeds. */
  wallSlug: string | null;
  /** A write is in flight somewhere in the list. */
  busy?: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onRename: (next: string) => void;
}

export const WidgetRow = React.memo(function WidgetRow({
  slug,
  entry,
  previewConfig,
  wallSlug,
  busy,
  onDuplicate,
  onDelete,
  onToggleActive,
  onRename,
}: WidgetRowProps) {
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
  const theme = themeMeta(entry.theme);
  const status = widgetStatusMeta(entry.isActive);
  const address = widgetWallUrl(entry, wallSlug);
  const { totalLoads, lastLoadAt } = entry.metrics;

  return (
    <>
      <ItemRow
        inactive={!entry.isActive}
        aria-label={`${entry.name} — ${kind.label}, ${layoutLabel(entry.layout)}`}
        leading={
          <Link
            href={widgetStudioPath(slug, entry.id)}
            prefetch
            aria-label={`Edit ${entry.name}`}
            className="bg-dot-grid relative block h-20 w-32 shrink-0 overflow-hidden rounded-md border border-border/70 bg-surface outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <WidgetPreviewPane
              entry={entry}
              previewConfig={previewConfig}
              className="absolute inset-0"
            />
          </Link>
        }
        title={
          // The list doesn't fetch drafts, so it never claims one is dirty.
          <InlineName
            value={entry.name}
            muted={!entry.isActive}
            dirty={false}
            onCommit={onRename}
          />
        }
        subtitle={
          <p className="truncate text-xs text-muted-foreground">
            {kind.label} · {layoutLabel(entry.layout)} · {theme.label}
            {address && (
              <>
                <span className="mx-1.5 text-border" aria-hidden>
                  ·
                </span>
                <span className="font-mono">{address}</span>
              </>
            )}
          </p>
        }
        metrics={
          // A real zero renders as `0`; a widget never served says so.
          <span className="text-xs tabular-nums text-muted-foreground">
            <span className="font-medium text-foreground">
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
          </span>
        }
        trailing={
          <div className="flex items-center gap-2">
            <StatusBadge {...status} />
            <span
              className="hidden text-xs tabular-nums text-muted-foreground sm:block"
              title={fmtDateTime(new Date(entry.updatedAt))}
            >
              {timeAgo(new Date(entry.updatedAt))}
            </span>
          </div>
        }
        actions={
          <ItemActionRow
            actions={actions}
            collapseUnder={420}
            visibleWhenCollapsed={2}
          />
        }
      />

      {deleteDialog}
    </>
  );
});
