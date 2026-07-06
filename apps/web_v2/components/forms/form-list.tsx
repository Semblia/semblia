"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "@phosphor-icons/react";
import type { V2FormIntent, V2ProjectDTO } from "@workspace/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeader,
  FilterPills as SharedFilterPills,
  RefreshingDataBadge,
  ViewToggle,
  PageBody,
} from "@/components/shared";
import { useViewMode } from "@/hooks/use-view-mode";
import { useLiveQueryState } from "@/hooks/use-live-query-state";
import { useFormsList, useCreateForm, useDeleteForm } from "@/hooks/api";
import { queryKeys } from "@/hooks/api/keys";
import { updateForm, saveFormDraft } from "@/lib/semblia-api";
import { createFormTemplate } from "@workspace/forms-core";
import { lookDesign, type FormLook } from "@/lib/forms/looks";
import { FormRow } from "./form-row";
import { FormCard } from "./form-card";
import { FormIntentPicker } from "./form-intent-picker";
import { FormsEmptyState } from "./forms-empty-state";

type Filter = "all" | "live" | "draft" | "closed";

const FILTERS: readonly Filter[] = ["all", "live", "draft", "closed"];

interface FormListProps {
  project: V2ProjectDTO;
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-6 py-4">
          <Skeleton className="size-9 shrink-0 rounded-lg animate-shimmer" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40 animate-shimmer" />
            <Skeleton className="h-2.5 w-24 animate-shimmer" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full animate-shimmer" />
        </div>
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="px-4 py-5 sm:px-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <Skeleton className="aspect-[16/10] w-full animate-shimmer" />
            <div className="space-y-2 px-3.5 pb-3 pt-3">
              <Skeleton className="h-3.5 w-32 animate-shimmer" />
              <Skeleton className="h-2.5 w-44 animate-shimmer" />
              <Skeleton className="mt-2 h-7 w-full animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface UpdateInput {
  formId: string;
  body: { name?: string; open?: boolean };
}

function useUpdateFormById(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ formId, body }: UpdateInput) => {
      const token = await getToken();
      return updateForm(token, slug, formId, body);
    },
    onSuccess: (data, { formId }) => {
      qc.setQueryData(queryKeys.forms.detail(slug, formId), data);
      qc.invalidateQueries({ queryKey: queryKeys.forms.list(slug) });
    },
  });
}

export function FormList({ project }: FormListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();

  const filterParam = (searchParams.get("status") ?? "all") as Filter;
  const filter: Filter = FILTERS.includes(filterParam) ? filterParam : "all";

  const pickerOpen = searchParams.get("new") === "1";

  const setQuery = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const listQuery = useFormsList(project.slug);
  const { isWaitingForLiveData, isBackgroundRefreshing } =
    useLiveQueryState(listQuery);

  const createMutation = useCreateForm(project.slug);
  const deleteMutation = useDeleteForm(project.slug);
  const updateMutation = useUpdateFormById(project.slug);

  const [viewMode, setViewMode] = useViewMode("forms:view", "grid");

  const list = React.useMemo(() => listQuery.data ?? [], [listQuery.data]);

  const counts: Record<Filter, number> = {
    all: list.length,
    live: list.filter((f) => f.status === "PUBLISHED" && f.open).length,
    draft: list.filter((f) => f.status === "DRAFT").length,
    closed: list.filter(
      (f) => f.status === "CLOSED" || (f.status === "PUBLISHED" && !f.open),
    ).length,
  };

  const filtered = React.useMemo(() => {
    switch (filter) {
      case "live":
        return list.filter((f) => f.status === "PUBLISHED" && f.open);
      case "draft":
        return list.filter((f) => f.status === "DRAFT");
      case "closed":
        return list.filter(
          (f) => f.status === "CLOSED" || (f.status === "PUBLISHED" && !f.open),
        );
      default:
        return list;
    }
  }, [list, filter]);

  const handleCreate = React.useCallback(
    async (intent: V2FormIntent, look: FormLook) => {
      const result = await createMutation.mutateAsync({ intent });
      // Apply the starting look onto the server-seeded draft (draftVersion 1).
      // Best-effort: a failure still leaves a perfectly valid default form.
      try {
        const template = createFormTemplate(intent);
        const doc = {
          ...template,
          design: {
            ...template.design,
            ...lookDesign(look, project.brandColorPrimary),
          },
        };
        const token = await getToken();
        await saveFormDraft(token, project.slug, result.id, {
          draft: doc as unknown as Record<string, unknown>,
          expectedVersion: 1,
        });
      } catch {
        // The studio hydrates whatever draft exists; no user-facing failure.
      }
      setQuery({ new: null });
      router.push(`/projects/${project.slug}/forms/${result.id}?firstRun=1`);
    },
    [
      createMutation,
      project.slug,
      project.brandColorPrimary,
      setQuery,
      router,
      getToken,
    ],
  );

  const handleDelete = React.useCallback(
    (formId: string) => deleteMutation.mutate(formId),
    [deleteMutation],
  );

  const handleToggleOpen = React.useCallback(
    (formId: string, open: boolean) =>
      updateMutation.mutate({ formId, body: { open: !open } }),
    [updateMutation],
  );

  const handleRename = React.useCallback(
    (formId: string, name: string) =>
      updateMutation.mutate({ formId, body: { name } }),
    [updateMutation],
  );

  const loading = isWaitingForLiveData;
  const showToolbar = !loading && list.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Forms"
        actions={
          showToolbar ? (
            <div className="flex items-center gap-2">
              <RefreshingDataBadge show={isBackgroundRefreshing} />
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setQuery({ new: "1" })}
                disabled={createMutation.isPending}
              >
                <PlusIcon className="size-3.5" weight="bold" aria-hidden />
                New form
              </Button>
            </div>
          ) : undefined
        }
        toolbar={
          showToolbar ? (
            <>
              <SharedFilterPills<Filter>
                aria-label="Filter forms by status"
                options={[
                  { id: "all", label: "All", count: counts.all },
                  { id: "live", label: "Live", count: counts.live },
                  { id: "draft", label: "Drafts", count: counts.draft },
                  { id: "closed", label: "Closed", count: counts.closed },
                ]}
                value={filter}
                onChange={(v) => setQuery({ status: v === "all" ? null : v })}
              />
              <div className="ml-auto">
                <ViewToggle value={viewMode} onChange={setViewMode} />
              </div>
            </>
          ) : undefined
        }
      />

      <PageBody padding="bare" className="overflow-y-auto">
        {loading ? (
          viewMode === "grid" ? (
            <GridSkeleton />
          ) : (
            <ListSkeleton />
          )
        ) : list.length === 0 ? (
          <FormsEmptyState onCreate={() => setQuery({ new: "1" })} />
        ) : filtered.length === 0 ? (
          <FilteredEmpty
            filter={filter}
            onReset={() => setQuery({ status: null })}
          />
        ) : viewMode === "list" ? (
          <div
            className="divide-y divide-border"
            role="list"
            aria-label="Forms"
          >
            {filtered.map((form) => (
              <FormRow
                key={form.id}
                slug={project.slug}
                form={form}
                onDelete={() => handleDelete(form.id)}
                onToggleOpen={() => handleToggleOpen(form.id, form.open)}
                onRename={(name) => handleRename(form.id, name)}
              />
            ))}
          </div>
        ) : (
          <div className="px-4 py-5 sm:px-6">
            <div
              className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              role="list"
              aria-label="Forms"
            >
              {filtered.map((form) => (
                <div key={form.id} role="listitem" className="h-full">
                  <FormCard
                    slug={project.slug}
                    form={form}
                    onDelete={() => handleDelete(form.id)}
                    onToggleOpen={() => handleToggleOpen(form.id, form.open)}
                    onRename={(name) => handleRename(form.id, name)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </PageBody>

      <FormIntentPicker
        open={pickerOpen}
        onOpenChange={(open) => {
          if (!open) setQuery({ new: null });
        }}
        onCreate={handleCreate}
        pending={createMutation.isPending}
        projectBrandColor={project.brandColorPrimary}
      />
    </div>
  );
}

function FilteredEmpty({
  filter,
  onReset,
}: {
  filter: Filter;
  onReset: () => void;
}) {
  const label =
    filter === "live" ? "live" : filter === "draft" ? "draft" : "closed";
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className="text-sm font-medium text-foreground">No {label} forms</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        Nothing here right now. Switch filters to see your other forms.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-1 text-xs"
        onClick={onReset}
      >
        Show all forms
      </Button>
    </div>
  );
}
