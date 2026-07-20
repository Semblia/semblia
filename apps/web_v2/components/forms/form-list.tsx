"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "@phosphor-icons/react";
import type {
  V2FormIntent,
  V2FormSummaryDTO,
  V2ProjectDTO,
} from "@workspace/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeader,
  FilterPills as SharedFilterPills,
  RefreshingDataBadge,
  ViewToggle,
  PageBody,
} from "@/components/shared";
import type { ViewMode } from "@/components/shared/view-toggle";
import { useViewMode } from "@/hooks/use-view-mode";
import { useLiveQueryState } from "@/hooks/use-live-query-state";
import { useFormsList, useCreateForm, useDeleteForm } from "@/hooks/api";
import { queryKeys } from "@/hooks/api/keys";
import { updateForm, saveFormDraft } from "@/lib/semblia-api";
import { createFormTemplate } from "@workspace/forms-core";
import { FormRow } from "./form-row";
import { FormCard } from "./form-card";
import { FormIntentPicker } from "./form-intent-picker";
import { FormsEmptyState } from "./forms-empty-state";

type Filter = "all" | "live" | "draft" | "closed";

const FILTERS: readonly Filter[] = ["all", "live", "draft", "closed"];

/** One predicate table so the pills' counts and the filtered list agree. */
const FILTER_PREDICATES: Record<Filter, (f: V2FormSummaryDTO) => boolean> = {
  all: () => true,
  live: (f) => f.status === "PUBLISHED" && f.open,
  draft: (f) => f.status === "DRAFT",
  closed: (f) => f.status === "CLOSED" || (f.status === "PUBLISHED" && !f.open),
};

function parseFilter(searchParams: ReturnType<typeof useSearchParams>): Filter {
  const param = (searchParams.get("status") ?? "all") as Filter;
  return FILTERS.includes(param) ? param : "all";
}

function countByFilter(list: V2FormSummaryDTO[]): Record<Filter, number> {
  return {
    all: list.length,
    live: list.filter(FILTER_PREDICATES.live).length,
    draft: list.filter(FILTER_PREDICATES.draft).length,
    closed: list.filter(FILTER_PREDICATES.closed).length,
  };
}

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

/** The chosen template + brand facts, stamped onto a fresh intent template. */
function buildSeededDoc(
  intent: V2FormIntent,
  delivery: "hosted" | "embed",
  templateId: string,
  brandColor: V2ProjectDTO["brandColorPrimary"],
  brandName: V2ProjectDTO["name"],
) {
  const seeded = createFormTemplate(intent, delivery);
  return {
    ...seeded,
    templateId,
    brand: {
      ...seeded.brand,
      color: brandColor || seeded.brand.color,
      name: brandName,
    },
  };
}

/** Patch the URL query string in place (null deletes a key). */
function useQueryPatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return React.useCallback(
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
}

/** Create the form, stamp template + brand onto its draft, open the studio. */
function useCreateSeededForm(
  project: V2ProjectDTO,
  setQuery: (patch: Record<string, string | null>) => void,
) {
  const router = useRouter();
  const { getToken } = useAuth();
  const createMutation = useCreateForm(project.slug);

  const handleCreate = React.useCallback(
    async (
      intent: V2FormIntent,
      templateId: string,
      delivery: "hosted" | "embed",
    ) => {
      const result = await createMutation.mutateAsync({ intent, delivery });
      // Stamp the chosen template + brand facts onto the server-seeded draft
      // (draftVersion 1). Best-effort: a failure still leaves a valid form.
      try {
        const doc = buildSeededDoc(
          intent,
          delivery,
          templateId,
          project.brandColorPrimary,
          project.name,
        );
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
      project.name,
      setQuery,
      router,
      getToken,
    ],
  );

  return { handleCreate, createPending: createMutation.isPending };
}

/** Row/card actions (delete, open/close, rename) bound to one project. */
function useFormItemActions(slug: string): FormItemActions {
  const deleteMutation = useDeleteForm(slug);
  const updateMutation = useUpdateFormById(slug);

  const onDelete = React.useCallback(
    (formId: string) => deleteMutation.mutate(formId),
    [deleteMutation],
  );
  const onToggleOpen = React.useCallback(
    (formId: string, open: boolean) =>
      updateMutation.mutate({ formId, body: { open: !open } }),
    [updateMutation],
  );
  const onRename = React.useCallback(
    (formId: string, name: string) =>
      updateMutation.mutate({ formId, body: { name } }),
    [updateMutation],
  );

  return React.useMemo(
    () => ({ onDelete, onToggleOpen, onRename }),
    [onDelete, onToggleOpen, onRename],
  );
}

export function FormList({ project }: FormListProps) {
  const searchParams = useSearchParams();
  const setQuery = useQueryPatcher();

  const filter = parseFilter(searchParams);
  const pickerOpen = searchParams.get("new") === "1";

  const listQuery = useFormsList(project.slug);
  const { isWaitingForLiveData: loading, isBackgroundRefreshing } =
    useLiveQueryState(listQuery);
  const [viewMode, setViewMode] = useViewMode("forms:view", "grid");

  const { handleCreate, createPending } = useCreateSeededForm(
    project,
    setQuery,
  );
  const itemActions = useFormItemActions(project.slug);

  const list = React.useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const filtered = React.useMemo(
    () => list.filter(FILTER_PREDICATES[filter]),
    [list, filter],
  );

  const showToolbar = !loading && list.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      <FormListHeader
        show={showToolbar}
        refreshing={isBackgroundRefreshing}
        createPending={createPending}
        counts={countByFilter(list)}
        filter={filter}
        viewMode={viewMode}
        onNew={() => setQuery({ new: "1" })}
        onFilterChange={(v) => setQuery({ status: v === "all" ? null : v })}
        onViewModeChange={setViewMode}
      />

      <PageBody padding="bare" className="overflow-y-auto">
        <FormListBody
          loading={loading}
          viewMode={viewMode}
          list={list}
          filtered={filtered}
          filter={filter}
          slug={project.slug}
          onCreate={() => setQuery({ new: "1" })}
          onResetFilter={() => setQuery({ status: null })}
          {...itemActions}
        />
      </PageBody>

      <FormIntentPicker
        open={pickerOpen}
        onOpenChange={(open) => {
          if (!open) setQuery({ new: null });
        }}
        onCreate={handleCreate}
        pending={createPending}
        projectBrandColor={project.brandColorPrimary}
      />
    </div>
  );
}

function FormListHeader({
  show,
  refreshing,
  createPending,
  counts,
  filter,
  viewMode,
  onNew,
  onFilterChange,
  onViewModeChange,
}: {
  show: boolean;
  refreshing: boolean | undefined;
  createPending: boolean;
  counts: Record<Filter, number>;
  filter: Filter;
  viewMode: ViewMode;
  onNew: () => void;
  onFilterChange: (v: Filter) => void;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  return (
    <PageHeader
      title="Forms"
      actions={
        show ? (
          <div className="flex items-center gap-2">
            <RefreshingDataBadge show={refreshing} />
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={onNew}
              disabled={createPending}
            >
              <PlusIcon className="size-3.5" weight="bold" aria-hidden />
              New form
            </Button>
          </div>
        ) : undefined
      }
      toolbar={
        show ? (
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
              onChange={onFilterChange}
            />
            <div className="ml-auto">
              <ViewToggle value={viewMode} onChange={onViewModeChange} />
            </div>
          </>
        ) : undefined
      }
    />
  );
}

interface FormItemActions {
  onDelete: (formId: string) => void;
  onToggleOpen: (formId: string, open: boolean) => void;
  onRename: (formId: string, name: string) => void;
}

function FormListBody({
  loading,
  viewMode,
  list,
  filtered,
  filter,
  slug,
  onCreate,
  onResetFilter,
  onDelete,
  onToggleOpen,
  onRename,
}: {
  loading: boolean | undefined;
  viewMode: ViewMode;
  list: V2FormSummaryDTO[];
  filtered: V2FormSummaryDTO[];
  filter: Filter;
  slug: string;
  onCreate: () => void;
  onResetFilter: () => void;
} & FormItemActions) {
  if (loading) return viewMode === "grid" ? <GridSkeleton /> : <ListSkeleton />;
  if (list.length === 0) return <FormsEmptyState onCreate={onCreate} />;
  if (filtered.length === 0) {
    return <FilteredEmpty filter={filter} onReset={onResetFilter} />;
  }
  if (viewMode === "list") {
    return (
      <FormRows
        slug={slug}
        forms={filtered}
        onDelete={onDelete}
        onToggleOpen={onToggleOpen}
        onRename={onRename}
      />
    );
  }
  return (
    <FormGrid
      slug={slug}
      forms={filtered}
      onDelete={onDelete}
      onToggleOpen={onToggleOpen}
      onRename={onRename}
    />
  );
}

function FormRows({
  slug,
  forms,
  onDelete,
  onToggleOpen,
  onRename,
}: {
  slug: string;
  forms: V2FormSummaryDTO[];
} & FormItemActions) {
  return (
    <div className="divide-y divide-border" role="list" aria-label="Forms">
      {forms.map((form) => (
        <FormRow
          key={form.id}
          slug={slug}
          form={form}
          onDelete={() => onDelete(form.id)}
          onToggleOpen={() => onToggleOpen(form.id, form.open)}
          onRename={(name) => onRename(form.id, name)}
        />
      ))}
    </div>
  );
}

function FormGrid({
  slug,
  forms,
  onDelete,
  onToggleOpen,
  onRename,
}: {
  slug: string;
  forms: V2FormSummaryDTO[];
} & FormItemActions) {
  return (
    <div className="px-4 py-5 sm:px-6">
      <div
        className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        role="list"
        aria-label="Forms"
      >
        {forms.map((form) => (
          <div key={form.id} role="listitem" className="h-full">
            <FormCard
              slug={slug}
              form={form}
              onDelete={() => onDelete(form.id)}
              onToggleOpen={() => onToggleOpen(form.id, form.open)}
              onRename={(name) => onRename(form.id, name)}
            />
          </div>
        ))}
      </div>
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
