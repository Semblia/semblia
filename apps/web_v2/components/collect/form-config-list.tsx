"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useStudioStore, isStudioDirty } from "@/lib/collect/studio-store";
import type { FormConfigEntry } from "@/lib/collect/studio-types";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlusIcon,
  PencilIcon,
  CopyIcon,
  TrashIcon,
  PauseIcon,
  PlayIcon
} from "@phosphor-icons/react";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function normalizeEntryMetrics(entry: FormConfigEntry): FormConfigEntry {
  return {
    ...entry,
    submissions: Number.isFinite(entry.submissions) ? entry.submissions : 0,
    views: Number.isFinite(entry.views) ? entry.views : 0,
    responseRate: Number.isFinite(entry.responseRate) ? entry.responseRate : 0,
    avgRating: Number.isFinite(entry.avgRating) ? entry.avgRating : 0,
    lastSubmissionAt:
      typeof entry.lastSubmissionAt === "number" &&
      Number.isFinite(entry.lastSubmissionAt)
        ? entry.lastSubmissionAt
        : null
  };
}

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

function FormItemSkeleton() {
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

/* ─── Inline name (click-to-rename) ──────────────────────────────────────── */

function InlineName({
  value,
  muted,
  dirty,
  onCommit,
}: {
  value: string;
  muted: boolean;
  dirty: boolean;
  onCommit: (next: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) {
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    else setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className={cn(
          "truncate bg-transparent text-[13px] font-medium outline-none",
          "border-b border-dashed border-muted-foreground/30",
          "text-foreground",
        )}
        style={{ width: "100%", padding: 0, margin: 0, lineHeight: "inherit" }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(value); setEditing(true); }}
      className={cn(
        "truncate text-left text-[13px] font-medium",
        muted ? "text-muted-foreground" : "text-foreground",
      )}
    >
      {value}{dirty && <span className="text-muted-foreground">*</span>}
    </button>
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

const FormItem = React.memo(function FormItem({
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

/* ─── Empty state ─────────────────────────────────────────────────────────── */

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <p className="text-sm font-medium text-foreground">No forms yet</p>
      <p className="max-w-[300px] text-xs leading-relaxed text-muted-foreground">
        Create your first testimonial collection form. You can run multiple
        variants for A/B testing.
      </p>
      <Button size="sm" className="mt-1 gap-1.5 text-xs" onClick={onCreate}>
        <PlusIcon className="size-3.5" aria-hidden="true" />
        Create form
      </Button>
    </div>
  );
}

const EMPTY_FORMS: FormConfigEntry[] = [];

/* ─── Main form config list ───────────────────────────────────────────────── */

export function FormConfigList({ slug }: { slug: string }) {
  const router = useRouter();
  const forms = useStudioStore((s) => s.formsByProject[slug]) ?? EMPTY_FORMS;
  const snapshots = useStudioStore((s) => s.snapshots);
  const ensureProject = useStudioStore((s) => s.ensureProject);
  const createForm = useStudioStore((s) => s.createForm);
  const deleteForm = useStudioStore((s) => s.deleteForm);
  const duplicateForm = useStudioStore((s) => s.duplicateForm);
  const updateFormEntry = useStudioStore((s) => s.updateFormEntry);

  const [hydrated, setHydrated] = React.useState(false);
  const normalizedForms = React.useMemo(
    () => forms.map(normalizeEntryMetrics),
    [forms]
  );

  // Ensure at least one form exists
  React.useEffect(() => {
    if (forms.length === 0) {
      ensureProject(slug);
    }
    setHydrated(true);
  }, [slug, forms.length, ensureProject]);

  const handleCreate = React.useCallback(() => {
    const formId = createForm(slug);
    router.push(`/projects/${slug}/collect/${formId}`);
  }, [slug, createForm, router]);

  const handleEdit = React.useCallback(
    (formId: string) => {
      router.push(`/projects/${slug}/collect/${formId}`);
    },
    [slug, router]
  );

  const handleDuplicate = React.useCallback(
    (formId: string) => {
      duplicateForm(slug, formId);
    },
    [slug, duplicateForm]
  );

  const handleDelete = React.useCallback(
    (formId: string) => {
      deleteForm(slug, formId);
    },
    [slug, deleteForm]
  );

  const handleToggleActive = React.useCallback(
    (formId: string, isActive: boolean) => {
      updateFormEntry(slug, formId, { isActive: !isActive });
    },
    [slug, updateFormEntry]
  );

  // A/B weight summary
  const totalActiveWeight = normalizedForms
    .filter((f) => f.isActive)
    .reduce((sum, f) => sum + f.abWeight, 0);

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Page header ── */}
      <div className="border-b border-border px-6 py-6 sm:py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold tracking-tight text-foreground sm:text-base">
              Forms
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Collect testimonials and feedback from your customers.
            </p>
          </div>
          {normalizedForms.length > 0 && (
            <Button
              size="sm"
              className="shrink-0 gap-1.5 text-xs"
              onClick={handleCreate}
            >
              <PlusIcon className="size-3.5" aria-hidden="true" />
              Create new
            </Button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {/* A/B weight warning */}
        {hydrated &&
          normalizedForms.length > 1 &&
          totalActiveWeight !== 100 &&
          totalActiveWeight > 0 && (
            <div
              className="mx-6 mt-4 rounded-md border border-border bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground"
              role="alert"
            >
              Active form weights total{" "}
              <strong className="text-foreground">{totalActiveWeight}%</strong>{" "}
              — should sum to 100% for proper A/B splitting.
            </div>
          )}

        {!hydrated ? (
          <>
            <FormItemSkeleton />
            <FormItemSkeleton />
          </>
        ) : normalizedForms.length === 0 ? (
          <EmptyState onCreate={handleCreate} />
        ) : (
          <div role="list" aria-label="Form configurations">
            {normalizedForms.map((entry) => (
              <div key={entry.id} role="listitem">
                <FormItem
                  entry={entry}
                  hasDirtyDraft={isStudioDirty(snapshots[entry.id])}
                  onEdit={() => handleEdit(entry.id)}
                  onDuplicate={() => handleDuplicate(entry.id)}
                  onDelete={() => handleDelete(entry.id)}
                  onToggleActive={() =>
                    handleToggleActive(entry.id, entry.isActive)
                  }
                  onRename={(name) =>
                    updateFormEntry(slug, entry.id, { name })
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
