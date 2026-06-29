"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  PencilSimple as PencilIcon,
  Copy as CopyIcon,
  Trash as TrashIcon,
  ArrowUpRight as ArrowUpRightIcon,
  Pause as PauseIcon,
  Play as PlayIcon,
  Sun as SunIcon,
  MoonStars as MoonIcon,
  CircleHalf as AutoIcon,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { fmtNum, timeAgo } from "@/lib/format";
import type {
  WidgetListEntry,
  WidgetStudioConfig,
} from "@/lib/widgets/widget-types";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Badge } from "@/components/ui/badge";
import { InlineName } from "@/components/studio/inline-name";
import { ItemShell, ItemActionRow, type ItemAction } from "@/components/shared";
import { WidgetLayoutPreview } from "./widget-layout-preview";
import { WidgetCardMiniPreview } from "./widget-card-mini-preview";
import { FALLBACK_TESTIMONIALS } from "@/lib/widgets/widget-fallback-testimonials";

const LAYOUT_LABEL: Record<WidgetListEntry["layout"], string> = {
  carousel: "Carousel",
  grid: "Grid",
  masonry: "Masonry",
  list: "List",
  wall: "Wall",
};

const THEME_META: Record<string, { icon: Icon; label: string }> = {
  light: { icon: SunIcon, label: "Light" },
  dark: { icon: MoonIcon, label: "Dark" },
  system: { icon: AutoIcon, label: "System" },
};
const THEME_FALLBACK = THEME_META.system;

function layoutLabel(layout: WidgetListEntry["layout"]): string {
  return LAYOUT_LABEL[layout] ?? "Custom";
}

interface WidgetRowProps {
  slug: string;
  entry: WidgetListEntry;
  /** Real widget config — when present, the panel renders the real widget. */
  previewConfig?: WidgetStudioConfig;
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
  previewConfig,
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

  const themeMeta = THEME_META[entry.theme] ?? THEME_FALLBACK;
  const ThemeIcon = themeMeta.icon;
  const themeLabel = themeMeta.label;

  return (
    <>
      {/* ponytail: uses ItemShell directly so the preview panel bleeds to full row height */}
      <ItemShell
        shape="row"
        inactive={!entry.isActive}
        aria-label={`${entry.name} (${layoutLabel(entry.layout)})`}
        className="overflow-hidden"
      >
        {/* Full-height left preview panel — real widget render when we have its
            config, synthetic layout glyph as a defensive fallback. */}
        <div
          className="relative w-[140px] shrink-0 overflow-hidden border-r border-border/50"
          aria-hidden
        >
          {previewConfig ? (
            <WidgetCardMiniPreview
              config={previewConfig}
              items={FALLBACK_TESTIMONIALS}
              className={cn(
                "absolute inset-0",
                !entry.isActive && "opacity-50 grayscale",
              )}
            />
          ) : (
            <WidgetLayoutPreview
              layout={entry.layout}
              kind={entry.kind}
              accent={entry.accent}
              theme={entry.theme}
              className="absolute inset-0"
            />
          )}
        </div>

        {/* Content area */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0 px-5 py-3.5">
          {/* Main line */}
          <div className="flex w-full items-center gap-3">
            <div className="min-w-0 flex-1">
              <InlineName
                value={entry.name}
                muted={!entry.isActive}
                dirty={hasDirtyDraft}
                onCommit={onRename}
              />
              <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                  <ThemeIcon className="size-2.5" weight="bold" aria-hidden />
                  {themeLabel}
                </span>
                <span className="text-border">·</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {layoutLabel(entry.layout)}
                </span>
              </div>
            </div>

            {/* Metrics */}
            <div className="hidden font-mono text-[11px] tabular-nums tracking-tight text-muted-foreground sm:block">
              {entry.metrics.totalLoads > 0 ? (
                <>
                  <span className="font-semibold text-foreground">
                    {fmtNum(entry.metrics.totalLoads)}
                  </span>{" "}
                  {entry.metrics.totalLoads === 1 ? "load" : "loads"}
                </>
              ) : (
                "No loads yet"
              )}
            </div>

            {/* Trailing */}
            <div className="flex shrink-0 items-center gap-2">
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
          </div>

          {/* Actions */}
          <div className="mt-2 w-full">
            <ItemActionRow
              actions={actions}
              collapseUnder={380}
              visibleWhenCollapsed={2}
            />
          </div>
        </div>
      </ItemShell>

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
