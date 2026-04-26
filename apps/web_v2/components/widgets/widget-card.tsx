"use client";

/**
 * WidgetCard — the gallery card. Visual-first: a live mini-preview of the
 * widget sits at the top, with a type ribbon, layout chip, theme strip,
 * inline-editable name, mono metrics, and a footer action row.
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
import { timeAgo } from "@/lib/mock-data";
import type { MockTestimonial } from "@/lib/mock-data";
import type {
  WidgetListEntry,
  WidgetStudioConfig,
} from "@/lib/widgets/widget-types";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { InlineName } from "@/components/collect/inline-name";
import {
  ItemShell,
  ItemActionRow,
  type ItemAction,
} from "@/components/shared";
import { WidgetCardMiniPreview } from "./widget-card-mini-preview";

interface WidgetCardProps {
  slug: string;
  entry: WidgetListEntry;
  config: WidgetStudioConfig;
  items: MockTestimonial[];
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
  config,
  items,
  hasDirtyDraft,
  onDuplicate,
  onDelete,
  onToggleActive,
  onRename,
}: WidgetCardProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const isWall = entry.kind === "wall";
  const editHref = `/projects/${slug}/widgets/${entry.id}`;
  const wallUrl = isWall ? `tresta.io/wall/${config.wall.slug}` : null;

  const handleCopyShare = React.useCallback(async () => {
    try {
      const text = isWall
        ? `https://${wallUrl}`
        : `<script src="https://cdn.tresta.io/embed.js" data-widget="${entry.id}" defer></script>`;
      await navigator.clipboard.writeText(text);
      toast.success(isWall ? "Wall URL copied" : "Embed snippet copied");
    } catch {
      toast.error("Couldn't copy. Try again.");
    }
  }, [isWall, wallUrl, entry.id]);

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
    <ItemShell
      shape="card"
      inactive={!entry.isActive}
      data-testid="widget-card"
      aria-label={`${entry.name} (${LAYOUT_LABEL[entry.layout]})`}
      className={cn(
        !entry.isActive && "border-dashed border-border/70",
      )}
    >
      {/* ── Preview pane ───────────────────────────────────────────── */}
      <Link
        href={editHref}
        className="relative block aspect-[16/10] overflow-hidden bg-muted/50 outline-none"
        prefetch
      >
        <div className="absolute inset-0">
          <WidgetCardMiniPreview
            config={config}
            items={items}
            ariaLabel={`Preview of ${entry.name}`}
          />
        </div>

        {/* Type ribbon — top-left */}
        <div
          className={cn(
            "absolute left-2 top-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
            "font-mono text-[8.5px] font-bold uppercase tracking-[0.16em]",
            "border backdrop-blur-md",
            isWall
              ? "border-emerald-400/30 bg-emerald-50/85 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-foreground/15 bg-background/85 text-foreground/80",
          )}
        >
          {isWall ? (
            <GlobeIcon className="size-2.5" weight="bold" aria-hidden />
          ) : (
            <CodeIcon className="size-2.5" weight="bold" aria-hidden />
          )}
          <span>{isWall ? "Wall of Love" : "Embed"}</span>
        </div>

        {/* Layout chip — top-right */}
        <div
          className={cn(
            "absolute right-2 top-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
            "font-mono text-[8.5px] font-medium uppercase tracking-[0.14em]",
            "border border-foreground/10 bg-background/85 text-foreground/70 backdrop-blur-md",
          )}
        >
          {LAYOUT_LABEL[entry.layout]}
        </div>

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
            "opacity-0 transition-opacity duration-200 group-hover:opacity-100",
          )}
        >
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border border-foreground/20",
              "bg-background/95 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-foreground shadow-sm",
            )}
          >
            <PencilIcon className="size-2.5" weight="bold" aria-hidden />
            Open
          </span>
        </div>
      </Link>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 px-3.5 pb-3 pt-3">
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
          <ThemeIcon
            theme={entry.theme}
            className="size-3 shrink-0 text-muted-foreground"
          />
        </div>

        {/* Metrics */}
        <div className="flex items-baseline gap-1.5 font-mono text-[10.5px] tabular-nums tracking-tight text-muted-foreground/80">
          <span className="font-semibold text-foreground">
            {fmtNum(entry.metrics.totalLoads)}
          </span>
          <span>loads</span>
          <span className="text-border">·</span>
          <span className="font-semibold text-foreground">
            {entry.metrics.avgLoadMs > 0 ? `${entry.metrics.avgLoadMs}ms` : "—"}
          </span>
          <span className="text-border">·</span>
          <span>
            {entry.metrics.lastLoadAt
              ? timeAgo(new Date(entry.metrics.lastLoadAt))
              : "no loads yet"}
          </span>
        </div>

        {/* Action row — collapses non-pinned actions into a menu under 340px */}
        <ItemActionRow
          actions={actions}
          collapseUnder={340}
          visibleWhenCollapsed={2}
          className="mt-1 border-t border-border/60 pt-2"
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
    </ItemShell>
  );
});
