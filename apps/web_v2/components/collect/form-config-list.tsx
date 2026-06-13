"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  dtoToFormConfigEntry,
  type FormConfigEntry,
} from "@/lib/collect/forms-list";
import { Button } from "@/components/ui/button";
import {
  Browsers as BrowsersIcon,
  StackSimple as StackSimpleIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import {
  PageBody,
  PageHeader,
  RefreshingDataBadge,
  ViewToggle,
  EmptyKindPicker,
  type EmptyKindOption,
} from "@/components/shared";
import { useViewMode } from "@/hooks/use-view-mode";
import {
  useFormsList,
  useCreateForm,
  useDeleteForm,
  useDuplicateForm,
} from "@/hooks/api";
import { queryKeys } from "@/hooks/api/keys";
import { useLiveQueryState } from "@/hooks/use-live-query-state";
import { updateForm } from "@/lib/semblia-api";

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

interface UpdateInput {
  formId: string;
  body: {
    name?: string;
    description?: string;
    isActive?: boolean;
    abWeight?: number;
    config?: unknown;
  };
}

function useUpdateFormById(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ formId, body }: UpdateInput) => {
      const token = await getToken();
      return updateForm(token, slug, formId, body as Record<string, unknown>);
    },
    onSuccess: (data, { formId }) => {
      qc.setQueryData(queryKeys.forms.detail(slug, formId), data);
      qc.invalidateQueries({ queryKey: queryKeys.forms.list(slug) });
    },
  });
}

export function FormConfigList({ slug }: { slug: string }) {
  const router = useRouter();
  const [viewMode, setViewMode] = useViewMode("collect:view", "list");

  const listQuery = useFormsList(slug);
  const { isWaitingForLiveData, isBackgroundRefreshing } =
    useLiveQueryState(listQuery);

  const createMutation = useCreateForm(slug);
  const duplicateMutation = useDuplicateForm(slug);
  const deleteMutation = useDeleteForm(slug);
  const updateMutation = useUpdateFormById(slug);

  const normalizedForms = React.useMemo(() => {
    const items = listQuery.data ?? [];
    return items.map((dto) =>
      normalizeEntryMetrics(dtoToFormConfigEntry(dto.entry, dto.config)),
    );
  }, [listQuery.data]);

  // Forms v4: the API owns the default document (publish-validated); the
  // layout-preset choice moves into the rebuilt parametric studio, so the
  // picked kind no longer shapes the config.
  const handleCreate = React.useCallback(async () => {
    const result = await createMutation.mutateAsync({
      name: "Default Form",
      description: "",
    });
    router.push(`/projects/${slug}/collect/${result.id}`);
  }, [slug, createMutation, router]);

  const handleEdit = React.useCallback(
    (formId: string) => {
      router.push(`/projects/${slug}/collect/${formId}`);
    },
    [slug, router],
  );

  const handleDuplicate = React.useCallback(
    (formId: string) => {
      duplicateMutation.mutate(formId);
    },
    [duplicateMutation],
  );

  const handleDelete = React.useCallback(
    (formId: string) => {
      deleteMutation.mutate(formId);
    },
    [deleteMutation],
  );

  const handleToggleActive = React.useCallback(
    (formId: string, isActive: boolean) => {
      updateMutation.mutate({ formId, body: { isActive: !isActive } });
    },
    [updateMutation],
  );

  const handleRename = React.useCallback(
    (formId: string, name: string) => {
      updateMutation.mutate({ formId, body: { name } });
    },
    [updateMutation],
  );

  const handleSetWeight = React.useCallback(
    (formId: string, abWeight: number) => {
      updateMutation.mutate({ formId, body: { abWeight } });
    },
    [updateMutation],
  );

  const totalActiveWeight = normalizedForms
    .filter((f) => f.isActive)
    .reduce((sum, f) => sum + f.abWeight, 0);

  const loading = isWaitingForLiveData;

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        contained
        title="Forms"
        actions={
          normalizedForms.length > 0 ? (
            <div className="flex items-center gap-2">
              <RefreshingDataBadge show={isBackgroundRefreshing} />
              <Button
                size="sm"
                className="shrink-0 gap-1.5 text-xs"
                onClick={() => handleCreate()}
                disabled={createMutation.isPending}
              >
                <PlusIcon className="size-3.5" aria-hidden="true" />
                Create new
              </Button>
            </div>
          ) : undefined
        }
        toolbar={
          normalizedForms.length > 0 ? (
            <ViewToggle value={viewMode} onChange={setViewMode} />
          ) : undefined
        }
      />

      <PageBody contained padding="bare" className="overflow-y-auto">
        {!loading &&
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

        {loading ? (
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
            onPick={() => handleCreate()}
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
                hasDirtyDraft={false}
                onEdit={() => handleEdit(entry.id)}
                onDuplicate={() => handleDuplicate(entry.id)}
                onDelete={() => handleDelete(entry.id)}
                onToggleActive={() =>
                  handleToggleActive(entry.id, entry.isActive)
                }
                onRename={(name) => handleRename(entry.id, name)}
                onSetWeight={(weight) => handleSetWeight(entry.id, weight)}
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
                  hasDirtyDraft={false}
                  onEdit={() => handleEdit(entry.id)}
                  onDuplicate={() => handleDuplicate(entry.id)}
                  onDelete={() => handleDelete(entry.id)}
                  onToggleActive={() =>
                    handleToggleActive(entry.id, entry.isActive)
                  }
                  onRename={(name) => handleRename(entry.id, name)}
                  onSetWeight={(weight) => handleSetWeight(entry.id, weight)}
                />
              </div>
            ))}
          </div>
        )}
      </PageBody>
    </div>
  );
}
