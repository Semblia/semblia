"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Globe as GlobeIcon,
  Code as CodeIcon,
  PencilSimple as PencilIcon,
  Copy as CopyIcon,
  Trash as TrashIcon,
  ArrowUpRight as ArrowUpRightIcon,
  Pause as PauseIcon,
  Play as PlayIcon,
  Sun as SunIcon,
  MoonStars as MoonIcon,
  CircleHalf as AutoIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { fmtNum } from "@/lib/format";
import { timeAgo } from "@/lib/format";
import type { WidgetListEntry } from "@/lib/widgets/widget-types";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Badge } from "@/components/ui/badge";
import { InlineName } from "@/components/collect/inline-name";
import { ItemRow, ItemActionRow, type ItemAction } from "@/components/shared";

const LAYOUT_LABEL: Record<WidgetListEntry["layout"], string> = {
  carousel: "Carousel",
  grid: "Grid",
  masonry: "Masonry",
  list: "List",
  wall: "Wall",
};

interface WidgetRowProps {
  slug: string;
  entry: WidgetListEntry;
  wallSlug: string | null;
  hasDirtyDraft: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onRename: (next: string) => void;
}

export const WidgetRow = React.memo(function WidgetRow({
  slug,
  entry,
  wallSlug,
  hasDirtyDraft,
  onDuplicate,
  onDelete,
  onToggleActive,
  onRename,
}: WidgetRowProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const isWall = entry.kind === "wall";
  const editHref = `/projects/${slug}/widgets/${entry.id}`;
  const wallUrl = isWall && wallSlug ? `semblia.com/wall/${wallSlug}` : null;

  const handleCopyShare = React.useCallback(async () => {
    if (isWall && !wallUrl) {
      toast.info("Open this wall in the studio to set its URL.");
      return;
    }
    try {
      const text = isWall
        ? `https://${wallUrl}`
        : `<script type="module" src="https://widgets.semblia.com/embed.js" async></script>
<semblia-widget project="${slug}" widget="${entry.id}"></semblia-widget>`;
      await navigator.clipboard.writeText(text);
      toast.success(isWall ? "Wall URL copied" : "Embed snippet copied");
    } catch {
      toast.error("Couldn't copy. Try again.");
    }
  }, [isWall, wallUrl, entry.id, slug]);

  const actions: ItemAction[] = [
    {
      id: "edit",
      label: "Edit",
      icon: PencilIcon,
      href: editHref,
      pinned: true,
    },
    {
      id: "share",
      label: isWall ? "Open" : "Snippet",
      icon: isWall ? ArrowUpRightIcon : CopyIcon,
      onSelect: handleCopyShare,
      pinned: true,
    },
    {
      id: "duplicate",
      label: "Duplicate",
      icon: CopyIcon,
      onSelect: onDuplicate,
    },
    {
      id: "toggle",
      label: entry.isActive ? "Pause" : "Activate",
      icon: entry.isActive ? PauseIcon : PlayIcon,
      tone: entry.isActive ? "warning" : "success",
      onSelect: onToggleActive,
    },
    {
      id: "delete",
      label: "Delete",
      icon: TrashIcon,
      tone: "danger",
      iconOnly: true,
      pinned: true,
      onSelect: () => setDeleteOpen(true),
    },
  ];

  const ThemeIcon =
    entry.theme === "light"
      ? SunIcon
      : entry.theme === "dark"
        ? MoonIcon
        : AutoIcon;
  const themeLabel =
    entry.theme === "system"
      ? "System"
      : entry.theme.charAt(0).toUpperCase() + entry.theme.slice(1);

  return (
    <>
      <ItemRow
        accentColor={entry.isActive ? "var(--brand)" : null}
        inactive={!entry.isActive}
        aria-label={`${entry.name} (${LAYOUT_LABEL[entry.layout]})`}
        padding="default"
        leading={
          /* Color swatch with kind icon */
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              "transition-all duration-200",
              !entry.isActive && "opacity-60",
            )}
            style={{
              backgroundColor: `${entry.accent}20`,
              border: `1.5px solid ${entry.accent}40`,
            }}
          >
            {isWall ? (
              <GlobeIcon
                className="size-4"
                style={{ color: entry.accent }}
                weight="fill"
                aria-hidden
              />
            ) : (
              <CodeIcon
                className="size-4"
                style={{ color: entry.accent }}
                weight="bold"
                aria-hidden
              />
            )}
          </div>
        }
        title={
          <InlineName
            value={entry.name}
            muted={!entry.isActive}
            dirty={hasDirtyDraft}
            onCommit={onRename}
          />
        }
        subtitle={
          <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <ThemeIcon className="size-2.5" weight="bold" aria-hidden />
              {themeLabel}
            </span>
            <span className="text-border">·</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {LAYOUT_LABEL[entry.layout]}
            </span>
          </div>
        }
        metrics={
          <div className="flex items-baseline gap-1 font-mono text-[11px] tabular-nums tracking-tight text-muted-foreground/80">
            <span className="font-semibold text-foreground">
              {fmtNum(entry.metrics.totalLoads)}
            </span>
            <span>loads</span>
            {entry.metrics.avgLoadMs > 0 && (
              <>
                <span className="px-0.5 text-border">·</span>
                <span className="font-semibold text-foreground">
                  {entry.metrics.avgLoadMs}ms
                </span>
              </>
            )}
          </div>
        }
        trailing={
          <div className="flex items-baseline gap-2">
            <Badge
              variant={entry.isActive ? "secondary" : "outline"}
              className={cn(
                "text-[10px] font-medium",
                !entry.isActive && "opacity-50",
              )}
            >
              {entry.isActive ? "Active" : "Paused"}
            </Badge>
            <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">
              {entry.metrics.lastLoadAt
                ? timeAgo(new Date(entry.metrics.lastLoadAt))
                : "—"}
            </span>
          </div>
        }
        actions={
          <ItemActionRow
            actions={actions}
            collapseUnder={380}
            visibleWhenCollapsed={2}
          />
        }
      />

      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        intent="danger"
        title={<>Delete &ldquo;{entry.name}&rdquo;?</>}
        description={
          <>
            Embeds using its id will stop rendering. This action cannot be
            undone.
          </>
        }
        cancelLabel="Keep widget"
        confirmLabel="Delete widget"
        onConfirm={onDelete}
      />
    </>
  );
});
