"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { fmtNum } from "@/lib/format";
import { timeAgo } from "@/lib/format";
import type { FormConfigEntry } from "@/lib/collect/studio-types";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardText as ClipboardTextIcon,
  PencilIcon,
  CopyIcon,
  TrashIcon,
  PauseIcon,
  PlayIcon,
  PencilSimpleLine as RenameIcon,
} from "@phosphor-icons/react";
import { ItemRow, ItemActionRow, type ItemAction } from "@/components/shared";
import { InlineName } from "./inline-name";

/* ─── Skeleton loader ─────────────────────────────────────────────────────── */

export function FormItemSkeleton() {
  return (
    <ItemRow
      accentColor={null}
      padding="default"
      title={
        <div className="space-y-2">
          <Skeleton className="h-4 w-40 animate-shimmer" />
          <Skeleton className="h-3 w-56 animate-shimmer" />
        </div>
      }
      metrics={
        <div className="flex items-center gap-3">
          <Skeleton className="h-3.5 w-20 animate-shimmer" />
          <Skeleton className="h-3.5 w-20 animate-shimmer" />
          <Skeleton className="h-3.5 w-10 animate-shimmer" />
        </div>
      }
      actions={
        <div className="flex items-center gap-1">
          <Skeleton className="h-6 w-14 animate-shimmer rounded-md" />
          <Skeleton className="h-6 w-20 animate-shimmer rounded-md" />
          <Skeleton className="h-6 w-14 animate-shimmer rounded-md" />
        </div>
      }
    />
  );
}

/* ─── Form item ───────────────────────────────────────────────────────────── */

export const FormItem = React.memo(function FormItem({
  entry,
  hasDirtyDraft,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleActive,
  onRename,
}: {
  entry: FormConfigEntry;
  hasDirtyDraft: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onRename: (name: string) => void;
}) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
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
      <ItemRow
        accentColor={entry.isActive ? "var(--brand)" : null}
        inactive={inactive}
        padding="default"
        onClick={renaming ? undefined : onEdit}
        aria-label={`Open ${entry.name}`}
        leading={
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted",
              inactive && "opacity-60",
            )}
          >
            <ClipboardTextIcon
              className="size-4 text-muted-foreground"
              weight="regular"
              aria-hidden
            />
          </div>
        }
        title={
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
        }
        subtitle={
          entry.description ? (
            <p
              className={cn(
                "truncate text-xs",
                inactive ? "text-muted-foreground/50" : "text-muted-foreground",
              )}
            >
              {entry.description}
            </p>
          ) : undefined
        }
        metrics={
          <div className="flex items-baseline gap-1 font-mono text-[11px] tabular-nums tracking-tight text-muted-foreground/80">
            <span className="font-semibold text-foreground">
              {fmtNum(entry.views)}
            </span>
            <span>views</span>
            <span className="px-0.5 text-border">&middot;</span>
            <span className="font-semibold text-foreground">
              {fmtNum(entry.submissions)}
            </span>
            <span>submissions</span>
            <span className="px-0.5 text-border">&middot;</span>
            <span className="font-semibold text-foreground">
              {entry.responseRate.toFixed(1)}%
            </span>
            <span>conv.</span>
          </div>
        }
        trailing={
          <div className="flex items-center gap-2">
            {entry.isActive && (
              <span
                className="font-mono text-[11px] tabular-nums text-muted-foreground"
                title="A/B traffic weight"
              >
                {entry.abWeight}%
              </span>
            )}
            {!entry.isActive && (
              <Badge variant="outline" className="text-[10px] font-medium">
                Paused
              </Badge>
            )}
            <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">
              {entry.updatedAt ? timeAgo(new Date(entry.updatedAt)) : "—"}
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
