"use client";

/**
 * WidgetCard — the gallery card. Visual-first: a static SVG layout preview
 * sits at the top, with a type ribbon, layout chip, theme strip, inline-
 * editable name, mono metrics, and a footer action row.
 *
 * The action row uses the shared `ItemActionRow` so non-primary actions
 * (Duplicate, Pause/Activate, Delete) collapse into a "More" menu when
 * the card is narrower than ~340 px — fixes the gallery overflow at
 * lg viewport widths where 3-up cards become tight.
 */

import * as React from "react";
import Link from "next/link";
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
import { widgetEmbedSnippet } from "@/lib/semblia-urls";
import type {
  WidgetListEntry,
  WidgetStudioConfig,
} from "@/lib/widgets/widget-types";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { InlineName } from "@/components/studio/inline-name";
import { ItemCard, ItemActionRow, type ItemAction } from "@/components/shared";
import { WidgetPreviewPane } from "./widget-preview-pane";

interface WidgetCardProps {
  slug: string;
  entry: WidgetListEntry;
  /** Real widget config — when present, the pane renders the real widget. */
  previewConfig?: WidgetStudioConfig;
  wallSlug: string | null;
  hasDirtyDraft: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onRename: (next: string) => void;
}

const LAYOUT_LABEL: Record<WidgetListEntry["layout"], string> = {
  carousel: "Carousel",
  grid: "Grid",
  masonry: "Masonry",
  list: "List",
  wall: "Wall",
};

function ThemeIcon({
  theme,
  className,
}: {
  theme: WidgetListEntry["theme"];
  className?: string;
}) {
  if (theme === "light") return <SunIcon className={className} weight="bold" />;
  if (theme === "dark") return <MoonIcon className={className} weight="bold" />;
  return <AutoIcon className={className} weight="bold" />;
}

export const WidgetCard = React.memo(function WidgetCard({
  slug,
  entry,
  previewConfig,
  wallSlug,
  hasDirtyDraft,
  onDuplicate,
  onDelete,
  onToggleActive,
  onRename,
}: WidgetCardProps) {
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
        : widgetEmbedSnippet(slug, entry.id);
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

  return (
    <ItemCard
      inactive={!entry.isActive}
      data-testid="widget-card"
      aria-label={`${entry.name} (${LAYOUT_LABEL[entry.layout]})`}
      className={cn(!entry.isActive && "border-dashed border-border/70")}
    >
      {/* ── Preview pane ───────────────────────────────────────────── */}
      <Link
        href={editHref}
        className="relative block aspect-[16/10] overflow-hidden bg-muted/30 outline-none"
        prefetch
      >
        <WidgetPreviewPane
          entry={entry}
          previewConfig={previewConfig}
          className="absolute inset-0"
        />

        {/* Theme strip — bottom edge */}
        <div className="absolute inset-x-0 bottom-0 flex h-[3px]" aria-hidden>
          <span
            className="flex-1"
            style={{
              background:
                entry.theme === "dark" ? "var(--background)" : "white",
              opacity: entry.theme === "dark" ? 0 : 0.6,
            }}
          />
          <span
            className="flex-1"
            style={{
              background: entry.accent,
              opacity: 0.85,
            }}
          />
          <span
            className="flex-1"
            style={{
              background: entry.theme === "light" ? "white" : "#0a0a0b",
              opacity: 0.7,
            }}
          />
        </div>

        {/* Hover overlay — Edit affordance */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 flex items-end justify-end p-2",
            "bg-gradient-to-t from-foreground/15 via-foreground/0 to-transparent",
            "opacity-0 transition-opacity duration-200 group-hover/item-shell:opacity-100",
          )}
        >
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border border-foreground/15",
              "bg-background/95 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm",
            )}
          >
            <PencilIcon className="size-3" weight="bold" aria-hidden />
            Open
          </span>
        </div>
      </Link>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col px-3.5 pb-3 pt-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <InlineName
              value={entry.name}
              muted={!entry.isActive}
              dirty={hasDirtyDraft}
              onCommit={onRename}
            />
            {isWall && wallUrl && (
              <button
                type="button"
                onClick={handleCopyShare}
                className={cn(
                  "mt-0.5 flex max-w-full items-center gap-1 truncate rounded font-mono text-[10px]",
                  "text-muted-foreground hover:text-foreground",
                  "transition-colors",
                )}
                aria-label={`Copy wall URL ${wallUrl}`}
              >
                <span className="truncate">{wallUrl}</span>
                <CopyIcon
                  className="size-2.5 shrink-0 opacity-60"
                  aria-hidden
                />
              </button>
            )}
          </div>
          {!entry.isActive && (
            <span className="mt-0.5 shrink-0 rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
              Paused
            </span>
          )}
        </div>

        {/* Meta — kind · layout · theme */}
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {isWall ? (
            <GlobeIcon
              className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400"
              weight="bold"
              aria-hidden
            />
          ) : (
            <CodeIcon className="size-3 shrink-0" weight="bold" aria-hidden />
          )}
          <span>{isWall ? "Wall" : "Embed"}</span>
          {!isWall && (
            <>
              <span className="text-border" aria-hidden>
                ·
              </span>
              <span>{LAYOUT_LABEL[entry.layout]}</span>
            </>
          )}
          <ThemeIcon theme={entry.theme} className="ml-auto size-3 shrink-0" />
        </div>

        {/* KPI — loads (single key metric) */}
        <div className="mt-1.5 font-mono text-[11px] tabular-nums tracking-tight text-muted-foreground">
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

        {/* Action row pinned to bottom of card */}
        <ItemActionRow
          actions={actions}
          collapseUnder={340}
          visibleWhenCollapsed={2}
          className="mt-auto border-t border-border/60 pt-2"
        />
      </div>

      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        intent="danger"
        title={<>Delete &ldquo;{entry.name}&rdquo;?</>}
        description={
          <>
            This permanently removes this widget. Embeds using its id will stop
            rendering. This action cannot be undone.
          </>
        }
        cancelLabel="Keep widget"
        confirmLabel="Delete widget"
        onConfirm={onDelete}
      />
    </ItemCard>
  );
});
