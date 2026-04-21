"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useStudioStore, isStudioDirty } from "@/lib/collect/studio-store";
import type { FormConfigEntry } from "@/lib/collect/studio-types";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@phosphor-icons/react";

import { FormItem, FormItemSkeleton } from "./form-item";
import { FormEmptyState } from "./form-empty-state";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

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

  const totalActiveWeight = normalizedForms
    .filter((f) => f.isActive)
    .reduce((sum, f) => sum + f.abWeight, 0);

  return (
    <div className="flex flex-1 flex-col">
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

      <div className="flex-1 overflow-y-auto">
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
          <FormEmptyState onCreate={handleCreate} />
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
