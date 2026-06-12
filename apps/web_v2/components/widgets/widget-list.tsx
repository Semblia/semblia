"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
// Phosphor icons now expects Icon suffixed imports. Pure "Plus" is deprecated.
import { PlusIcon, GlobeIcon, CodeIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeader,
  HeaderCaption,
  FilterPills as SharedFilterPills,
  RefreshingDataBadge,
  ViewToggle,
  PageBody,
} from "@/components/shared";
import { useViewMode } from "@/hooks/use-view-mode";
import { useLiveQueryState } from "@/hooks/use-live-query-state";
import type { V2ProjectDTO } from "@workspace/types";
import {
  useWidgetsList,
  useCreateWidget,
  useDeleteWidget,
  useDuplicateWidget,
} from "@/hooks/api";
import { queryKeys } from "@/hooks/api/keys";
import { updateWidget } from "@/lib/semblia-api";
import { dtoToWidgetListEntry } from "@/lib/widgets/dto-adapter";
import type { WidgetKind, WidgetLayout } from "@/lib/widgets/widget-types";
import { WidgetCard } from "./widget-card";
import { WidgetRow } from "./widget-row";
import { WidgetEmptyState } from "./widget-empty-state";
import { WidgetKindPicker } from "./widget-kind-picker";

type Filter = "all" | "embed" | "wall";

interface WidgetListProps {
  project: V2ProjectDTO;
}

function GalleryGridSkeleton() {
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

function buildCreatePayload(
  kind: WidgetKind,
  layout: WidgetLayout | undefined,
  brandColor: string,
): Record<string, unknown> {
  const isWall = kind === "wall";
  return {
    name: isWall ? "Wall of Love" : "Untitled embed",
    kind,
    layout: isWall ? "wall" : (layout ?? "carousel"),
    accent: brandColor,
  };
}

interface UpdateInput {
  widgetId: string;
  body: Record<string, unknown>;
}

function useUpdateWidgetById(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ widgetId, body }: UpdateInput) => {
      const token = await getToken();
      return updateWidget(token, slug, widgetId, body);
    },
    onSuccess: (data, { widgetId }) => {
      qc.setQueryData(queryKeys.widgets.detail(slug, widgetId), data);
      qc.invalidateQueries({ queryKey: queryKeys.widgets.list(slug) });
    },
  });
}

export function WidgetList({ project }: WidgetListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filterParam = (searchParams.get("type") ?? "all") as Filter;
  const filter: Filter = ["all", "embed", "wall"].includes(filterParam)
    ? filterParam
    : "all";

  const newParam = searchParams.get("new");
  const pickerOpen =
    newParam === "1" || newParam === "embed" || newParam === "wall";
  const initialKind: WidgetKind | null =
    newParam === "embed" ? "embed" : newParam === "wall" ? "wall" : null;

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

  const listQuery = useWidgetsList(project.slug);
  const { isWaitingForLiveData, isBackgroundRefreshing } =
    useLiveQueryState(listQuery);

  const createMutation = useCreateWidget(project.slug);
  const duplicateMutation = useDuplicateWidget(project.slug);
  const deleteMutation = useDeleteWidget(project.slug);
  const updateMutation = useUpdateWidgetById(project.slug);

  const [viewMode, setViewMode] = useViewMode("widgets:view", "grid");

  const brandAccent = project.brandColorPrimary ?? "#6366f1";

  const list = React.useMemo(() => {
    const rows = listQuery.data ?? [];
    return rows.map((dto) => dtoToWidgetListEntry(dto, brandAccent));
  }, [listQuery.data, brandAccent]);

  const counts: Record<Filter, number> = {
    all: list.length,
    embed: list.filter((w) => w.kind === "embed").length,
    wall: list.filter((w) => w.kind === "wall").length,
  };

  const filtered =
    filter === "all" ? list : list.filter((w) => w.kind === filter);

  const handleCreate = React.useCallback(
    async ({ kind, layout }: { kind: WidgetKind; layout?: WidgetLayout }) => {
      const result = await createMutation.mutateAsync(
        buildCreatePayload(kind, layout, brandAccent),
      );
      setQuery({ new: null });
      router.push(`/projects/${project.slug}/widgets/${result.id}?firstRun=1`);
    },
    [createMutation, project.slug, brandAccent, setQuery, router],
  );

  const handleDuplicate = React.useCallback(
    (widgetId: string) => {
      duplicateMutation.mutate(widgetId);
    },
    [duplicateMutation],
  );

  const handleDelete = React.useCallback(
    (widgetId: string) => {
      deleteMutation.mutate(widgetId);
    },
    [deleteMutation],
  );

  const handleToggleActive = React.useCallback(
    (widgetId: string, isActive: boolean) =>
      updateMutation.mutate({ widgetId, body: { isActive: !isActive } }),
    [updateMutation],
  );

  const handleRename = React.useCallback(
    (widgetId: string, name: string) =>
      updateMutation.mutate({ widgetId, body: { name } }),
    [updateMutation],
  );

  const loading = isWaitingForLiveData;
  const showToolbar = !loading && list.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Widgets"
        actions={
          showToolbar ? (
            <div className="flex items-center gap-2">
              <RefreshingDataBadge show={isBackgroundRefreshing} />
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setQuery({ new: "wall" })}
              >
                <GlobeIcon className="size-3.5" weight="bold" aria-hidden />
                New wall
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setQuery({ new: "embed" })}
                disabled={createMutation.isPending}
              >
                <PlusIcon className="size-3.5" weight="bold" aria-hidden />
                New embed
              </Button>
            </div>
          ) : undefined
        }
        toolbar={
          showToolbar ? (
            <>
              <SharedFilterPills<Filter>
                aria-label="Filter widgets by kind"
                options={[
                  { id: "all", label: "All", count: counts.all },
                  { id: "embed", label: "Embeds", count: counts.embed },
                  { id: "wall", label: "Walls", count: counts.wall },
                ]}
                value={filter}
                onChange={(v) => setQuery({ type: v === "all" ? null : v })}
              />
              <HeaderCaption>
                Edits auto-deploy. No re-embed needed.
              </HeaderCaption>
              <div className="ml-auto">
                <ViewToggle value={viewMode} onChange={setViewMode} />
              </div>
            </>
          ) : undefined
        }
      />

      <PageBody padding="bare" className="overflow-y-auto">
        {loading ? (
          <GalleryGridSkeleton />
        ) : list.length === 0 ? (
          <WidgetEmptyState onPick={(kind) => setQuery({ new: kind })} />
        ) : filtered.length === 0 ? (
          <FilteredEmpty
            kind={filter as Exclude<Filter, "all">}
            onCreate={() => setQuery({ new: filter as WidgetKind })}
          />
        ) : viewMode === "list" ? (
          <div
            className="divide-y divide-border"
            role="list"
            aria-label="Widgets"
          >
            {filtered.map((entry) => (
              <WidgetRow
                key={entry.id}
                slug={project.slug}
                entry={entry}
                wallSlug={null}
                hasDirtyDraft={false}
                onDuplicate={() => handleDuplicate(entry.id)}
                onDelete={() => handleDelete(entry.id)}
                onToggleActive={() =>
                  handleToggleActive(entry.id, entry.isActive)
                }
                onRename={(name) => handleRename(entry.id, name)}
              />
            ))}
          </div>
        ) : (
          <div className="px-4 py-5 sm:px-6">
            <div
              className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              role="list"
              aria-label="Widgets"
            >
              {filtered.map((entry) => (
                <div key={entry.id} role="listitem" className="h-full">
                  <WidgetCard
                    slug={project.slug}
                    entry={entry}
                    wallSlug={null}
                    hasDirtyDraft={false}
                    onDuplicate={() => handleDuplicate(entry.id)}
                    onDelete={() => handleDelete(entry.id)}
                    onToggleActive={() =>
                      handleToggleActive(entry.id, entry.isActive)
                    }
                    onRename={(name) => handleRename(entry.id, name)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </PageBody>

      <WidgetKindPicker
        open={pickerOpen}
        onOpenChange={(open) => {
          if (!open) setQuery({ new: null });
        }}
        onCreate={handleCreate}
        initialKind={initialKind}
      />
    </div>
  );
}

function FilteredEmpty({
  kind,
  onCreate,
}: {
  kind: "embed" | "wall";
  onCreate: () => void;
}) {
  const Icon = kind === "wall" ? GlobeIcon : CodeIcon;
  const label = kind === "wall" ? "Wall of Love" : "Embed widget";
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-lg",
          kind === "wall"
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-foreground/10 text-foreground",
        )}
      >
        <Icon className="size-4" weight="bold" />
      </span>
      <p className="text-sm font-medium text-foreground">No {label}s yet</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        {kind === "wall"
          ? "Walls are public hosted pages — perfect for sharing on socials."
          : "Embeds drop into any site with a single script tag."}
      </p>
      <Button size="sm" className="mt-1 gap-1.5 text-xs" onClick={onCreate}>
        <PlusIcon className="size-3.5" weight="bold" aria-hidden />
        Create {label.toLowerCase()}
      </Button>
    </div>
  );
}
