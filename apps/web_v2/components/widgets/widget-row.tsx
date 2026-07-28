"use client";

/**
 * WidgetRow — one widget in the dense list view.
 *
 * Rebuilt onto `ItemRow`. The previous row reached past the primitive to
 * `ItemShell` so it could bleed a 140 px live preview to the row's full height,
 * and then hand-rolled the title/meta/metric/trailing layout that `ItemRow`
 * already owns. Two costs: the row anatomy drifted from every other row in the
 * app, and no shared skeleton could match it, so a cold load shifted the page.
 *
 * The preview belongs to the grid view — that is what the view toggle is for.
 * The list view leads with the kind glyph at exactly the size
 * `ListSkeleton leading="square"` reserves, so the swap from skeleton to rows
 * moves nothing.
 *
 * Row anatomy, identical wherever a widget appears:
 *   [kind] name                loads · last load     one badge     edited
 *          embed · carousel · light                  [actions]
 */

import * as React from "react";
import { fmtCount, fmtDateTime, timeAgo } from "@/lib/format";
import type { WidgetListEntry } from "@/lib/widgets/widget-types";
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

interface WidgetRowProps {
  slug: string;
  entry: WidgetListEntry;
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
  const KindIcon = kind.icon;
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
          <span
            className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"
            aria-hidden
          >
            <KindIcon className="size-4" weight="bold" />
          </span>
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
