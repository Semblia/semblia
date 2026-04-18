"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useStudioStore, isStudioDirty } from "@/lib/collect/studio-store";
import type { FormConfigEntry } from "@/lib/collect/studio-types";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  PlusIcon,
  PencilIcon,
  CopyIcon,
  TrashIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
} from "lucide-react";

/* ─── Weight bar (A/B traffic indicator) ──────────────────────────────────── */

function WeightBar({ weight, isActive }: { weight: number; isActive: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 rounded-full bg-muted"
        style={{ width: 60 }}
        role="meter"
        aria-valuenow={weight}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`A/B traffic weight: ${weight}%`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isActive ? "bg-primary" : "bg-muted-foreground/30",
          )}
          style={{ width: `${weight}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground">{weight}%</span>
    </div>
  );
}

/* ─── Form card ───────────────────────────────────────────────────────────── */

const FormCard = React.memo(function FormCard({
  entry,
  slug,
  hasDirtyDraft,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleActive,
}: {
  entry: FormConfigEntry;
  slug: string;
  hasDirtyDraft: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-lg border p-4 transition-colors",
        entry.isActive
          ? "border-primary/30 bg-primary/[0.02]"
          : "border-border/60 hover:border-border",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium">{entry.name}</h3>
            {entry.isActive && (
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                Active
              </span>
            )}
            {hasDirtyDraft && (
              <span
                className="size-1.5 shrink-0 rounded-full bg-amber-500"
                title="Unsaved changes"
              />
            )}
          </div>
          {entry.description && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {entry.description}
            </p>
          )}
        </div>

        {/* A/B weight */}
        <WeightBar weight={entry.abWeight} isActive={entry.isActive} />
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>
          Created{" "}
          {new Date(entry.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        {entry.updatedAt !== entry.createdAt && (
          <span>
            · Updated{" "}
            {new Date(entry.updatedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <Button variant="default" size="sm" className="gap-1.5 text-xs" onClick={onEdit}>
          <PencilIcon className="size-3" aria-hidden="true" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onToggleActive}
          aria-label={entry.isActive ? "Deactivate form" : "Activate form"}
        >
          {entry.isActive ? (
            <ToggleRightIcon className="size-3.5" aria-hidden="true" />
          ) : (
            <ToggleLeftIcon className="size-3.5" aria-hidden="true" />
          )}
          {entry.isActive ? "Deactivate" : "Activate"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onDuplicate}
          aria-label="Duplicate form"
        >
          <CopyIcon className="size-3" aria-hidden="true" />
          Duplicate
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-destructive hover:text-destructive"
              aria-label="Delete form"
            >
              <TrashIcon className="size-3" aria-hidden="true" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete &ldquo;{entry.name}&rdquo;?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove this form configuration and its draft.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
});

/* ─── Empty state ─────────────────────────────────────────────────────────── */

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border/70 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <PlusIcon className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-sm font-medium">No form configurations yet</h3>
        <p className="mt-1 max-w-[320px] text-xs text-muted-foreground">
          Create your first testimonial collection form. You can have multiple forms per project
          for A/B testing.
        </p>
      </div>
      <Button size="sm" className="gap-1.5" onClick={onCreate}>
        <PlusIcon className="size-3.5" aria-hidden="true" />
        Create first form
      </Button>
    </div>
  );
}

/* ─── Main form config list ───────────────────────────────────────────────── */

export function FormConfigList({ slug }: { slug: string }) {
  const router = useRouter();
  const forms = useStudioStore((s) => s.formsByProject[slug] ?? []);
  const snapshots = useStudioStore((s) => s.snapshots);
  const ensureProject = useStudioStore((s) => s.ensureProject);
  const createForm = useStudioStore((s) => s.createForm);
  const deleteForm = useStudioStore((s) => s.deleteForm);
  const duplicateForm = useStudioStore((s) => s.duplicateForm);
  const updateFormEntry = useStudioStore((s) => s.updateFormEntry);

  // Ensure at least one form exists
  React.useEffect(() => {
    if (forms.length === 0) {
      ensureProject(slug);
    }
  }, [slug, forms.length, ensureProject]);

  const handleCreate = React.useCallback(() => {
    const formId = createForm(slug);
    router.push(`/projects/${slug}/collect/${formId}`);
  }, [slug, createForm, router]);

  const handleEdit = React.useCallback(
    (formId: string) => {
      router.push(`/projects/${slug}/collect/${formId}`);
    },
    [slug, router],
  );

  const handleDuplicate = React.useCallback(
    (formId: string) => {
      duplicateForm(slug, formId);
    },
    [slug, duplicateForm],
  );

  const handleDelete = React.useCallback(
    (formId: string) => {
      deleteForm(slug, formId);
    },
    [slug, deleteForm],
  );

  const handleToggleActive = React.useCallback(
    (formId: string, isActive: boolean) => {
      updateFormEntry(slug, formId, { isActive: !isActive });
    },
    [slug, updateFormEntry],
  );

  // A/B weight summary
  const totalActiveWeight = forms
    .filter((f) => f.isActive)
    .reduce((sum, f) => sum + f.abWeight, 0);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Collection Forms</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manage testimonial forms and A/B test variants for this project.
          </p>
        </div>
        {forms.length > 0 && (
          <Button size="sm" className="gap-1.5 text-xs" onClick={handleCreate}>
            <PlusIcon className="size-3.5" aria-hidden="true" />
            New form
          </Button>
        )}
      </div>

      {/* A/B weight warning */}
      {forms.length > 1 && totalActiveWeight !== 100 && totalActiveWeight > 0 && (
        <div
          className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/30 dark:bg-amber-900/10 dark:text-amber-300"
          role="alert"
        >
          Active form weights total <strong>{totalActiveWeight}%</strong> — they should sum to 100%
          for proper A/B traffic splitting.
        </div>
      )}

      {/* List */}
      {forms.length === 0 ? (
        <EmptyState onCreate={handleCreate} />
      ) : (
        <div className="flex flex-col gap-3" role="list" aria-label="Form configurations">
          {forms.map((entry) => (
            <div key={entry.id} role="listitem">
              <FormCard
                entry={entry}
                slug={slug}
                hasDirtyDraft={isStudioDirty(snapshots[entry.id])}
                onEdit={() => handleEdit(entry.id)}
                onDuplicate={() => handleDuplicate(entry.id)}
                onDelete={() => handleDelete(entry.id)}
                onToggleActive={() => handleToggleActive(entry.id, entry.isActive)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
