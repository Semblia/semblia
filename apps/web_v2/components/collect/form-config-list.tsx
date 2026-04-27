"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useStudioStore, isStudioDirty } from "@/lib/collect/studio-store";
import type { FormConfigEntry } from "@/lib/collect/studio-types";
import { Button } from "@/components/ui/button";
import {
  Browsers as BrowsersIcon,
  StackSimple as StackSimpleIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import {
  PageBody,
  PageHeader,
  ViewToggle,
  EmptyKindPicker,
  type EmptyKindOption,
} from "@/components/shared";
import { useViewMode } from "@/hooks/use-view-mode";

import { FormItem, FormItemSkeleton } from "./form-item";
import { FormItemCard, FormItemCardSkeleton } from "./form-item-card";

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
        : null,
  };
}

const EMPTY_FORMS: FormConfigEntry[] = [];

type CollectKind = "single" | "stepped";

const EMPTY_KINDS: EmptyKindOption<CollectKind>[] = [
  {
    id: "stepped",
    title: "Stepped flow",
    pitch:
      "Guide respondents one question at a time. Higher completion rates for longer forms.",
    bullets: [
      "Progress bar keeps respondents oriented",
      "Conditional logic per step",
      "Works great on mobile",
    ],
    icon: StackSimpleIcon,
    accentClass: "bg-brand-muted text-brand-foreground",
  },
  {
    id: "single",
    title: "Single page",
    pitch:
      "All fields visible at once. Best for short forms where respondents want to see everything.",
    bullets: [
      "Familiar form layout",
      "Faster to fill for power users",
      "Easy to embed inline on a page",
    ],
    icon: BrowsersIcon,
    accentClass: "bg-foreground/10 text-foreground",
  },
];

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
  const [viewMode, setViewMode] = useViewMode("collect:view", "list");
  const normalizedForms = React.useMemo(
    () => forms.map(normalizeEntryMetrics),
    [forms],
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

  const totalActiveWeight = normalizedForms
    .filter((f) => f.isActive)
    .reduce((sum, f) => sum + f.abWeight, 0);

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Forms"
        description="Collect testimonials and feedback from your customers."
        actions={
          normalizedForms.length > 0 ? (
            <Button
              size="sm"
              className="shrink-0 gap-1.5 text-xs"
              onClick={handleCreate}
            >
              <PlusIcon className="size-3.5" aria-hidden="true" />
              Create new
            </Button>
          ) : undefined
        }
        toolbar={
          normalizedForms.length > 0 ? (
            <ViewToggle value={viewMode} onChange={setViewMode} />
          ) : undefined
        }
      />

      <PageBody padding="bare" className="overflow-y-auto">
        {hydrated &&
          normalizedForms.length > 1 &&
          totalActiveWeight !== 100 &&
          totalActiveWeight > 0 && (
            <div
              className="mx-4 mt-4 rounded-md border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-200 sm:mx-6"
              role="alert"
            >
              Active form weights total{" "}
              <strong className="text-amber-950 dark:text-amber-100">
                {totalActiveWeight}%
              </strong>{" "}
              — should sum to 100% for proper A/B splitting.
            </div>
          )}

        {!hydrated ? (
          viewMode === "list" ? (
            <div className="divide-y divide-border">
              <FormItemSkeleton />
              <FormItemSkeleton />
            </div>
          ) : (
            <div className="grid auto-rows-fr grid-cols-1 gap-3 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-4">
              <FormItemCardSkeleton />
              <FormItemCardSkeleton />
              <FormItemCardSkeleton />
            </div>
          )
        ) : normalizedForms.length === 0 ? (
          <EmptyKindPicker<CollectKind>
            heading="New form"
            subheading="Start collecting testimonials."
            footnote="You can run multiple form variants in parallel for A/B testing."
            kinds={EMPTY_KINDS}
            onPick={handleCreate}
          />
        ) : viewMode === "list" ? (
          <div
            className="divide-y divide-border"
            role="list"
            aria-label="Form configurations"
          >
            {normalizedForms.map((entry) => (
              <FormItem
                key={entry.id}
                entry={entry}
                hasDirtyDraft={isStudioDirty(snapshots[entry.id])}
                onEdit={() => handleEdit(entry.id)}
                onDuplicate={() => handleDuplicate(entry.id)}
                onDelete={() => handleDelete(entry.id)}
                onToggleActive={() =>
                  handleToggleActive(entry.id, entry.isActive)
                }
                onRename={(name) => updateFormEntry(slug, entry.id, { name })}
              />
            ))}
          </div>
        ) : (
          <div
            className="grid auto-rows-fr grid-cols-1 gap-3 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-4"
            role="list"
            aria-label="Form configurations"
          >
            {normalizedForms.map((entry) => (
              <div key={entry.id} role="listitem" className="h-full">
                <FormItemCard
                  entry={entry}
                  layout={snapshots[entry.id]?.draft.layout ?? null}
                  hasDirtyDraft={isStudioDirty(snapshots[entry.id])}
                  onEdit={() => handleEdit(entry.id)}
                  onDuplicate={() => handleDuplicate(entry.id)}
                  onDelete={() => handleDelete(entry.id)}
                  onToggleActive={() =>
                    handleToggleActive(entry.id, entry.isActive)
                  }
                  onRename={(name) => updateFormEntry(slug, entry.id, { name })}
                />
              </div>
            ))}
          </div>
        )}
      </PageBody>
    </div>
  );
}
