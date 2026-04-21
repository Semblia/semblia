"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { fmtNum } from "@/lib/format";
import type { FormConfigEntry } from "@/lib/collect/studio-types";
import { ActionButton } from "@/components/ui/action-button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PencilIcon,
  CopyIcon,
  TrashIcon,
  PauseIcon,
  PlayIcon
} from "@phosphor-icons/react";
import { InlineName } from "./inline-name";

/* ─── Row shell — consistent left indicator for all rows ───────────────── */

const ROW_BASE = "border-b border-border py-5 pr-6 pl-6";

function rowIndicatorStyle(active: boolean): React.CSSProperties {
  return {
    borderLeftWidth: 3,
    borderLeftStyle: "solid",
    borderLeftColor: active ? "var(--brand)" : "transparent",
  };
}

/* ─── Skeleton loader ─────────────────────────────────────────────────────── */

export function FormItemSkeleton() {
  return (
    <div className={ROW_BASE} style={rowIndicatorStyle(false)}>
      <div className="flex items-baseline justify-between gap-6">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-40 animate-shimmer" />
          <Skeleton className="h-3 w-56 animate-shimmer" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-3.5 w-20 animate-shimmer" />
          <Skeleton className="h-3.5 w-20 animate-shimmer" />
          <Skeleton className="h-3.5 w-10 animate-shimmer" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1">
        <Skeleton className="h-6 w-14 rounded-md animate-shimmer" />
        <Skeleton className="h-6 w-20 rounded-md animate-shimmer" />
        <Skeleton className="h-6 w-14 rounded-md animate-shimmer" />
      </div>
    </div>
  );
}

/* ─── Inline metric ──────────────────────────────────────────────────────── */

function MetricRow({ views, submissions, rate, muted }: { views: number; submissions: number; rate: number; muted?: boolean }) {
  return (
    <div className={cn(
      "flex shrink-0 items-baseline gap-1 font-mono text-[11.5px] tracking-tight",
      muted && "opacity-50",
    )}>
      <span className="font-semibold tabular-nums text-foreground">{fmtNum(views)}</span>
      <span className="text-muted-foreground/60">visits</span>
      <span className="px-1 text-border">&middot;</span>
      <span className="font-semibold tabular-nums text-foreground">{fmtNum(submissions)}</span>
      <span className="text-muted-foreground/60">submissions</span>
      <span className="px-1 text-border">&middot;</span>
      <span className="font-semibold tabular-nums text-foreground">{rate.toFixed(1)}%</span>
      <span className="text-muted-foreground/60">conversion</span>
    </div>
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
  const inactive = !entry.isActive;

  return (
    <div className={ROW_BASE} style={rowIndicatorStyle(entry.isActive)}>
      {/* Row 1: name + metrics */}
      <div className="flex items-baseline justify-between gap-6">
        <div className="min-w-0 flex-1">
          <InlineName
            value={entry.name}
            muted={inactive}
            dirty={hasDirtyDraft}
            onCommit={onRename}
          />
          {entry.description && (
            <p className={cn(
              "mt-0.5 truncate text-xs",
              inactive ? "text-muted-foreground/50" : "text-muted-foreground",
            )}>
              {entry.description}
            </p>
          )}
        </div>

        <MetricRow
          views={entry.views}
          submissions={entry.submissions}
          rate={entry.responseRate}
          muted={inactive}
        />
      </div>

      {/* Row 2: actions — always visible, grouped by intent */}
      <div className="mt-3 flex items-center">
        {/* Primary + secondary grouped tight */}
        <div className="flex items-center gap-1">
          <ActionButton tone="neutral" variant="ghost" size="xs" className="gap-1" onClick={onEdit}>
            <PencilIcon className="size-3" aria-hidden="true" />
            Edit
          </ActionButton>
          <ActionButton tone="neutral" variant="ghost" size="xs" className="gap-1" onClick={onDuplicate}>
            <CopyIcon className="size-3" aria-hidden="true" />
            Duplicate
          </ActionButton>
        </div>

        {/* Status toggle — separated by spacing */}
        <div className="ml-3">
          <ActionButton
            tone={entry.isActive ? "warning" : "success"}
            variant="ghost"
            size="xs"
            className="gap-1"
            onClick={onToggleActive}
          >
            {entry.isActive ? (
              <PauseIcon className="size-3" aria-hidden="true" />
            ) : (
              <PlayIcon className="size-3" aria-hidden="true" />
            )}
            {entry.isActive ? "Pause" : "Activate"}
          </ActionButton>
        </div>

        <div className="flex-1" />

        {/* Destructive — far right */}
        <ActionButton
          tone="danger"
          variant="ghost"
          size="xs"
          className="gap-1"
          onClick={() => setDeleteOpen(true)}
        >
          <TrashIcon className="size-3" aria-hidden="true" />
          Delete
        </ActionButton>
      </div>

      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        intent="danger"
        title={<>Delete &ldquo;{entry.name}&rdquo;?</>}
        description={
          <>
            This permanently removes this form configuration and its draft.
            This action cannot be undone.
          </>
        }
        cancelLabel="Keep form"
        confirmLabel="Delete form"
        onConfirm={onDelete}
      />
    </div>
  );
});
