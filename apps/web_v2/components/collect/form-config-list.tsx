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
import { PlusIcon } from "@phosphor-icons/react";
import {
  PageBody,
  PageHeader,
  RefreshingDataBadge,
  ViewToggle,
} from "@/components/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormStarterGallery } from "./form-starter-gallery";
import type { FormStarter } from "@/lib/collect/form-starters";
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
  const [starterOpen, setStarterOpen] = React.useState(false);

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

  // Forms v4: the API accepts a full publish-validated `config` at creation, so
  // a starter posts its curated FormDefinitionDoc directly. `null` = blank/default
  // (the API supplies its own default document).
  const handleCreate = React.useCallback(
    async (starter: FormStarter | null) => {
      const config = starter ? starter.build() : undefined;
      const result = await createMutation.mutateAsync({
        name: starter ? starter.name : "Untitled form",
        description: "",
        ...(config ? { config } : {}),
      });
      setStarterOpen(false);
      router.push(`/projects/${slug}/collect/${result.id}`);
    },
    [slug, createMutation, router],
  );

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
        title="Forms"
        actions={
          normalizedForms.length > 0 ? (
            <div className="flex items-center gap-2">
              <RefreshingDataBadge show={isBackgroundRefreshing} />
              <Button
                size="sm"
                className="shrink-0 gap-1.5 text-xs"
                onClick={() => setStarterOpen(true)}
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

      <PageBody padding="bare" className="overflow-y-auto">
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
          <div className="px-4 py-8 sm:px-6">
            <div className="mx-auto mb-5 max-w-2xl text-center">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Create your first form
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Start from a template or a blank form. You can change the layout
                and theme anytime in the studio.
              </p>
            </div>
            <FormStarterGallery
              onSelect={handleCreate}
              busy={createMutation.isPending}
            />
          </div>
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

      <Dialog open={starterOpen} onOpenChange={setStarterOpen}>
        <DialogContent
          className="max-w-[calc(100%-2rem)] gap-0 p-0 sm:max-w-3xl"
          showCloseButton
        >
          <DialogHeader className="border-b border-border/60 px-6 py-4">
            <DialogTitle className="text-base font-semibold tracking-tight">
              New form
            </DialogTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick a starting point. Everything is editable in the studio.
            </p>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto p-5">
            <FormStarterGallery
              onSelect={handleCreate}
              busy={createMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
