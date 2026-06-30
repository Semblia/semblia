"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
// Phosphor icons now expects Icon suffixed imports. Pure "Plus" is deprecated.
import { PlusIcon, GlobeIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  FilterPills as SharedFilterPills,
  RefreshingDataBadge,
  ViewToggle,
  PageBody,
} from "@/components/shared";
import { useViewMode } from "@/hooks/use-view-mode";
import { useLiveQueryState } from "@/hooks/use-live-query-state";
import type { V2ProjectDTO, V2WidgetDTO } from "@workspace/types";
import {
  useWidgetsList,
  useCreateWidget,
  useDeleteWidget,
  useDuplicateWidget,
} from "@/hooks/api";
import { queryKeys } from "@/hooks/api/keys";
import { updateWidget } from "@/lib/semblia-api";
import {
  dtoToWidgetListEntry,
  dtoToWidgetStudioConfig,
} from "@/lib/widgets/dto-adapter";
import type {
  WidgetKind,
  WidgetLayout,
  WidgetStudioConfig,
} from "@/lib/widgets/widget-types";
import { WidgetKindPicker } from "./widget-kind-picker";
import {
  WidgetListContent,
  type WidgetListFilter,
} from "./widget-list-content";

// Real widget config per id, for rendering an actual scaled widget preview in
// the card/row. A malformed config is skipped (falls back to the layout glyph).
function buildConfigById(
  rows: V2WidgetDTO[] | undefined,
): Map<string, WidgetStudioConfig> {
  const map = new Map<string, WidgetStudioConfig>();
  for (const dto of rows ?? []) {
    try {
      map.set(dto.id, dtoToWidgetStudioConfig(dto.config));
    } catch {
      // skip — card/row falls back to the synthetic preview
    }
  }
  return map;
}

interface WidgetListProps {
  project: V2ProjectDTO;
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

  const filterParam = (searchParams.get("type") ?? "all") as WidgetListFilter;
  const filter: WidgetListFilter = ["all", "embed", "wall"].includes(
    filterParam,
  )
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
    return rows.map((dto) => dtoToWidgetListEntry(dto.entry, brandAccent));
  }, [listQuery.data, brandAccent]);

  const configById = React.useMemo(
    () => buildConfigById(listQuery.data),
    [listQuery.data],
  );

  const counts: Record<WidgetListFilter, number> = {
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

  const loading = Boolean(isWaitingForLiveData);
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
              <SharedFilterPills<WidgetListFilter>
                aria-label="Filter widgets by kind"
                options={[
                  { id: "all", label: "All", count: counts.all },
                  { id: "embed", label: "Embeds", count: counts.embed },
                  { id: "wall", label: "Walls", count: counts.wall },
                ]}
                value={filter}
                onChange={(v) => setQuery({ type: v === "all" ? null : v })}
              />
              <div className="ml-auto">
                <ViewToggle value={viewMode} onChange={setViewMode} />
              </div>
            </>
          ) : undefined
        }
      />

      <PageBody padding="bare" className="overflow-y-auto">
        <WidgetListContent
          projectSlug={project.slug}
          loading={loading}
          listCount={list.length}
          filtered={filtered}
          filter={filter}
          viewMode={viewMode}
          configById={configById}
          onPick={(kind) => setQuery({ new: kind })}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onRename={handleRename}
        />
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
