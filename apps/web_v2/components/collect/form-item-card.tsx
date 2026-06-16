"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { fmtNum } from "@/lib/format";
import {
  LAYOUT_PRESET_LABEL,
  type FormConfigEntry,
} from "@/lib/collect/forms-list";
import {
  PencilIcon,
  CopyIcon,
  TrashIcon,
  PauseIcon,
  PlayIcon,
  Percent as PercentIcon,
  PencilSimpleLine as RenameIcon,
} from "@phosphor-icons/react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ItemCard, ItemActionRow, type ItemAction } from "@/components/shared";
import { InlineName } from "./inline-name";
import { FormCardPreview } from "./form-card-preview";
import { AbWeightDialog } from "./ab-weight-dialog";

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
  hasDirtyDraft,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleActive,
  onRename,
  onSetWeight,
}: {
  entry: FormConfigEntry;
  hasDirtyDraft: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onRename: (name: string) => void;
  onSetWeight: (weight: number) => void;
}) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [weightOpen, setWeightOpen] = React.useState(false);
  const [renaming, setRenaming] = React.useState(false);
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
      id: "rename",
      label: "Rename",
      icon: RenameIcon,
      onSelect: () => setRenaming(true),
    },
    {
      id: "duplicate",
      label: "Duplicate",
      icon: CopyIcon,
      onSelect: onDuplicate,
    },
    {
      id: "weight",
      label: "A/B weight",
      icon: PercentIcon,
      onSelect: () => setWeightOpen(true),
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
      <ItemCard
        inactive={inactive}
        onClick={renaming ? undefined : onEdit}
        aria-label={`Open ${entry.name}`}
      >
        {/* Preview pane — keyed off the form's v4 layout preset */}
        <div className="relative block aspect-[16/10] overflow-hidden">
          <FormCardPreview
            preset={entry.layoutPreset}
            inactive={inactive}
            className="absolute inset-0"
          />
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col px-3.5 pb-3 pt-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <InlineName
                value={entry.name}
                muted={inactive}
                dirty={hasDirtyDraft}
                onCommit={(next) => {
                  onRename(next);
                  setRenaming(false);
                }}
                editing={renaming}
                onEditingChange={setRenaming}
                onDoubleClickRename={() => setRenaming(true)}
              />
              {entry.description && (
                <p
                  className={cn(
                    "mt-0.5 line-clamp-2 text-xs leading-relaxed",
                    inactive
                      ? "text-muted-foreground/50"
                      : "text-muted-foreground",
                  )}
                >
                  {entry.description}
                </p>
              )}
            </div>
            {!entry.isActive && (
              <Badge
                variant="outline"
                className="shrink-0 text-[10px] font-medium"
              >
                Paused
              </Badge>
            )}
          </div>

          <div className="mt-1.5 flex items-baseline justify-between gap-2 font-mono text-[10.5px] tabular-nums tracking-tight text-muted-foreground/80">
            <div className="flex flex-wrap items-baseline gap-1.5">
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
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              {entry.layoutPreset && (
                <span className="text-muted-foreground/70">
                  {LAYOUT_PRESET_LABEL[entry.layoutPreset]}
                </span>
              )}
              {entry.isActive && (
                <>
                  {entry.layoutPreset && <span className="text-border">·</span>}
                  <span className="text-muted-foreground" title="A/B weight">
                    {entry.abWeight}%
                  </span>
                </>
              )}
            </div>
          </div>

          <ItemActionRow
            actions={actions}
            collapseUnder={340}
            visibleWhenCollapsed={2}
            className="mt-2"
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

      <AbWeightDialog
        name={entry.name}
        currentWeight={entry.abWeight}
        open={weightOpen}
        onOpenChange={setWeightOpen}
        onSubmit={onSetWeight}
      />
    </>
  );
});
