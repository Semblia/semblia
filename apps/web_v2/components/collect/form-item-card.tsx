"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { fmtNum } from "@/lib/format";
import type { FormConfigEntry, LayoutConfig } from "@/lib/collect/studio-types";
import {
  PencilIcon,
  CopyIcon,
  TrashIcon,
  PauseIcon,
  PlayIcon,
} from "@phosphor-icons/react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ItemCard, ItemActionRow, type ItemAction } from "@/components/shared";
import { InlineName } from "./inline-name";
import { FormCardPreview } from "./form-card-preview";

const FLOW_LABEL: Record<LayoutConfig["flow"], string> = {
  all: "All fields",
  stepped: "Stepped",
  cards: "Cards",
  conversational: "Conversational",
};

const DETAIL_LABEL: Record<LayoutConfig["container"], string> = {
  boxed: "Boxed",
  split: "Split",
  fullbleed: "Full-bleed",
  centered: "Centered",
};

const HERO_LABEL: Record<LayoutConfig["hero"], string> = {
  none: "Minimal",
  top: "Top hero",
  side: "Side hero",
  floating: "Floating hero",
};

/* ─── Skeleton ────────────────────────────────────────────────────────────── */

export function FormItemCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="aspect-[16/10] w-full animate-shimmer" />
      <div className="space-y-2 px-3.5 pb-3 pt-3">
        <Skeleton className="h-3.5 w-32 animate-shimmer" />
        <Skeleton className="h-2.5 w-44 animate-shimmer" />
        <Skeleton className="mt-2 h-7 w-full animate-shimmer" />
      </div>
    </div>
  );
}

/* ─── Form card ───────────────────────────────────────────────────────────── */

export const FormItemCard = React.memo(function FormItemCard({
  entry,
  layout,
  hasDirtyDraft,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleActive,
  onRename,
}: {
  entry: FormConfigEntry;
  layout: LayoutConfig | null;
  hasDirtyDraft: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onRename: (name: string) => void;
}) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const inactive = !entry.isActive;

  const actions: ItemAction[] = [
    {
      id: "edit",
      label: "Edit",
      icon: PencilIcon,
      onSelect: onEdit,
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
    <>
      {/* Flexible mode — caller controls full layout to match widget-card */}
      <ItemCard inactive={inactive}>
        {/* Preview pane */}
        <div className="relative block aspect-[16/10] overflow-hidden">
          <FormCardPreview
            layout={layout}
            inactive={inactive}
            className="absolute inset-0"
          />

          {/* Flow ribbon — top-left */}
          <div className="absolute left-2 top-2">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.16em]",
                "border backdrop-blur-md",
                entry.isActive
                  ? "border-foreground/15 bg-background/85 text-foreground/80"
                  : "border-border/60 bg-muted/80 text-muted-foreground",
              )}
            >
              {layout ? FLOW_LABEL[layout.flow] : "Form"}
            </span>
          </div>

          {/* Layout chip — top-right */}
          <div className="absolute right-2 top-2">
            <span className="inline-flex items-center rounded-md border border-foreground/10 bg-background/85 px-1.5 py-0.5 font-mono text-[8.5px] font-medium uppercase tracking-[0.16em] text-foreground/70 backdrop-blur-md">
              {layout && layout.hero !== "none"
                ? HERO_LABEL[layout.hero]
                : layout
                  ? DETAIL_LABEL[layout.container]
                  : entry.isActive
                    ? "Active"
                    : "Paused"}
              {entry.abWeight !== 100 && entry.isActive
                ? ` · ${entry.abWeight}%`
                : ""}
            </span>
          </div>

          {/* Theme strip — bottom edge */}
          <div className="absolute inset-x-0 bottom-0 flex h-[3px]" aria-hidden>
            <span className="flex-1 bg-background/60" />
            <span className="flex-1 bg-primary/75" />
            <span className="flex-1 bg-muted-foreground/25" />
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col px-3.5 pb-3 pt-3">
          <InlineName
            value={entry.name}
            muted={inactive}
            dirty={hasDirtyDraft}
            onCommit={onRename}
          />
          {entry.description && (
            <p
              className={cn(
                "mt-0.5 line-clamp-2 text-xs leading-relaxed",
                inactive ? "text-muted-foreground/50" : "text-muted-foreground",
              )}
            >
              {entry.description}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5 font-mono text-[10.5px] tabular-nums tracking-tight text-muted-foreground/80">
            <span className="font-semibold text-foreground">
              {fmtNum(entry.views)}
            </span>
            <span>views</span>
            <span className="text-border">·</span>
            <span className="font-semibold text-foreground">
              {fmtNum(entry.submissions)}
            </span>
            <span>submissions</span>
            <span className="text-border">·</span>
            <span className="font-semibold text-foreground">
              {entry.responseRate.toFixed(1)}%
            </span>
            <span>conv.</span>
          </div>

          <ItemActionRow
            actions={actions}
            collapseUnder={340}
            visibleWhenCollapsed={2}
            className="mt-auto border-t border-border/60 pt-2"
          />
        </div>
      </ItemCard>

      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        intent="danger"
        title={<>Delete &ldquo;{entry.name}&rdquo;?</>}
        description={
          <>
            This permanently removes this form configuration and its draft. This
            action cannot be undone.
          </>
        }
        cancelLabel="Keep form"
        confirmLabel="Delete form"
        onConfirm={onDelete}
      />
    </>
  );
});
