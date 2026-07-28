"use client";

/**
 * WidgetList — the widget gallery.
 *
 * The surface had no failure state at all. `widget-list-content.tsx` ran the
 * ladder by hand — `loading ? <Skeleton/> : listCount === 0 ? <Empty/> : rows`
 * — over a query whose `isError` was never read, so a 500 on the widgets
 * endpoint showed an owner with twelve live embeds the first-run kind picker.
 * Every write was as quiet: `mutate()` with no `onError`, so a rejected delete,
 * pause, or rename looked exactly like a no-op.
 *
 * Rebuilt on the shared data-surface system:
 *   • `useDataState` owns the ladder, error first, so "empty" while the request
 *     failed is not expressible here
 *   • the filter pills and the view toggle stay mounted through every load and
 *     every state — the controls that scope a view must not vanish while it
 *     loads, and they were previously unmounted for exactly that stretch
 *   • one collection feeds two views: `DataList` rows or the sanctioned card
 *     grid, where the tile *is* the widget
 *   • every mutation reports its own failure, naming what didn't happen
 *   • the wall address comes from each widget's saved config instead of the
 *     hard-coded `null` that had left every wall's share action dead
 */

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GlobeIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DataList,
  DataState,
  FilterPills,
  GridSkeleton,
  ListSkeleton,
  NoResults,
  PageBody,
  PageHeader,
  RefreshingDataBadge,
  ViewToggle,
  useDataState,
} from "@/components/shared";
import { useViewMode } from "@/hooks/use-view-mode";
import type { V2ProjectDTO, V2WidgetDTO } from "@workspace/types";
import {
  useWidgetsList,
  useBillingUsage,
  useCreateWidget,
  useDeleteWidget,
  useDuplicateWidget,
} from "@/hooks/api";
import { queryKeys } from "@/hooks/api/keys";
import { updateWidget, saveWidgetDraft } from "@/lib/semblia-api";
import { accountBillingPath, widgetStudioPath } from "@/lib/routes";
import { fmtCount } from "@/lib/format";
import { widgetDefinitionDocSchema } from "@workspace/widgets-core/schema";
import { TEMPLATE_TO_LAYOUT } from "@/lib/widgets/widget-presets";
import {
  dtoToWidgetListEntry,
  dtoToWidgetStudioConfig,
} from "@/lib/widgets/dto-adapter";
import type {
  WidgetKind,
  WidgetListEntry,
  WidgetStudioConfig,
} from "@/lib/widgets/widget-types";
import { WidgetCard } from "./widget-card";
import { WidgetEmptyState } from "./widget-empty-state";
import { WidgetKindPicker } from "./widget-kind-picker";
import { WidgetRow } from "./widget-row";

export type WidgetListFilter = "all" | "embed" | "wall";

const FILTERS: { id: WidgetListFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "embed", label: "Embeds" },
  { id: "wall", label: "Walls" },
];

/** Used only until the project's own brand colour has been picked. */
const DEFAULT_ACCENT = "#6366f1";

interface WidgetListProps {
  project: V2ProjectDTO;
}

/**
 * Each widget's parsed config, keyed by id, for the real preview render and the
 * wall address. A record whose saved config doesn't parse is left out on
 * purpose: `WidgetPreviewPane` then draws a labelled diagram instead of passing
 * a stranger's design off as this widget's.
 */
function buildConfigById(
  rows: V2WidgetDTO[] | undefined,
): Map<string, WidgetStudioConfig> {
  const map = new Map<string, WidgetStudioConfig>();
  for (const dto of rows ?? []) {
    try {
      map.set(dto.id, dtoToWidgetStudioConfig(dto.config));
    } catch {
      // Intentionally skipped — see WidgetPreviewPane's schematic state.
    }
  }
  return map;
}

function buildCreatePayload(
  kind: WidgetKind,
  templateId: string,
  brandColor: string,
): Record<string, unknown> {
  const isWall = kind === "wall";
  return {
    name: isWall ? "Wall of Love" : "Untitled embed",
    kind,
    layout: isWall ? "wall" : (TEMPLATE_TO_LAYOUT[templateId] ?? "carousel"),
    accent: brandColor,
  };
}

interface UpdateInput {
  widgetId: string;
  body: Record<string, unknown>;
}

/**
 * The shared `useUpdateWidget` binds one widget id at hook time, which a list
 * can't do — the id is only known at the moment of the click.
 */
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
  const { getToken } = useAuth();

  const typeParam = searchParams.get("type") ?? "all";
  const filter: WidgetListFilter = FILTERS.some((f) => f.id === typeParam)
    ? (typeParam as WidgetListFilter)
    : "all";

  const newParam = searchParams.get("new");
  const pickerOpen =
    newParam === "1" || newParam === "embed" || newParam === "wall";
  const initialKind: WidgetKind | null =
    newParam === "embed" ? "embed" : newParam === "wall" ? "wall" : null;

  // The URL is the source of truth for what the view is scoped to, so a reload,
  // a shared link, and the back button all reproduce the same gallery.
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
  const [viewMode, setViewMode] = useViewMode("widgets:view", "grid");

  const brandAccent = project.brandColorPrimary ?? DEFAULT_ACCENT;

  const entries = React.useMemo(
    () =>
      (listQuery.data ?? []).map((dto) =>
        dtoToWidgetListEntry(dto.entry, brandAccent),
      ),
    [listQuery.data, brandAccent],
  );

  const configById = React.useMemo(
    () => buildConfigById(listQuery.data),
    [listQuery.data],
  );

  // Null until the list has actually arrived: a count whose source hasn't
  // answered is hidden, never rendered as `0`.
  const counts = listQuery.data ? countByKind(entries) : null;

  const visible =
    filter === "all" ? entries : entries.filter((w) => w.kind === filter);

  const state = useDataState(listQuery, {
    count: visible.length,
    // A project with no widgets at all is a first run, whichever pill happens
    // to be active — the recovery is "create one", not "clear the filter".
    filtered: filter !== "all" && entries.length > 0,
  });

  const createBlockedReason = useCreateBlockedReason();
  const createMutation = useCreateWidget(project.slug);
  const duplicateMutation = useDuplicateWidget(project.slug);
  const deleteMutation = useDeleteWidget(project.slug);
  const updateMutation = useUpdateWidgetById(project.slug);
  const busy =
    duplicateMutation.isPending ||
    deleteMutation.isPending ||
    updateMutation.isPending;

  const handleCreate = React.useCallback(
    async ({ kind, templateId }: { kind: WidgetKind; templateId: string }) => {
      try {
        const result = await createMutation.mutateAsync(
          buildCreatePayload(kind, templateId, brandAccent),
        );
        await stampTemplate({
          token: await getToken(),
          slug: project.slug,
          widgetId: result.id,
          definition: result.config.definition,
          templateId,
          brandAccent,
        });
        setQuery({ new: null });
        router.push(`${widgetStudioPath(project.slug, result.id)}?firstRun=1`);
      } catch {
        toast.error("Couldn't create the widget. Nothing was saved.");
      }
    },
    [createMutation, project.slug, brandAccent, setQuery, router, getToken],
  );

  const handleDuplicate = React.useCallback(
    (widgetId: string) => {
      duplicateMutation.mutate(widgetId, {
        onSuccess: () => toast.success("Widget duplicated"),
        onError: () => toast.error("Couldn't duplicate this widget."),
      });
    },
    [duplicateMutation],
  );

  const handleDelete = React.useCallback(
    (widgetId: string) => {
      deleteMutation.mutate(widgetId, {
        onSuccess: () => toast.success("Widget deleted"),
        onError: () => toast.error("Couldn't delete this widget."),
      });
    },
    [deleteMutation],
  );

  const handleToggleActive = React.useCallback(
    (widgetId: string, isActive: boolean) => {
      updateMutation.mutate(
        { widgetId, body: { isActive: !isActive } },
        {
          onSuccess: () =>
            toast.success(isActive ? "Widget paused" : "Widget activated"),
          onError: () =>
            toast.error(
              isActive
                ? "Couldn't pause this widget."
                : "Couldn't activate this widget.",
            ),
        },
      );
    },
    [updateMutation],
  );

  const handleRename = React.useCallback(
    (widgetId: string, name: string) => {
      updateMutation.mutate(
        { widgetId, body: { name } },
        { onError: () => toast.error("Couldn't rename this widget.") },
      );
    },
    [updateMutation],
  );

  const itemProps = (entry: WidgetListEntry) => ({
    slug: project.slug,
    entry,
    wallSlug: wallSlugFor(configById.get(entry.id)),
    busy,
    onDuplicate: () => handleDuplicate(entry.id),
    onDelete: () => handleDelete(entry.id),
    onToggleActive: () => handleToggleActive(entry.id, entry.isActive),
    onRename: (name: string) => handleRename(entry.id, name),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Widgets"
        description={
          counts
            ? `${fmtCount(counts.all)} ${counts.all === 1 ? "widget" : "widgets"} · ${fmtCount(counts.paused)} paused`
            : undefined
        }
        actions={
          <>
            <RefreshingDataBadge show={state.isRefreshing} />
            {createBlockedReason && (
              <span className="max-w-xs text-xs text-muted-foreground">
                {createBlockedReason}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setQuery({ new: "wall" })}
              disabled={
                createMutation.isPending || createBlockedReason !== null
              }
              aria-busy={createMutation.isPending}
            >
              <GlobeIcon className="size-3.5" weight="bold" aria-hidden />
              Create wall
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setQuery({ new: "embed" })}
              disabled={
                createMutation.isPending || createBlockedReason !== null
              }
              aria-busy={createMutation.isPending}
            >
              <PlusIcon className="size-3.5" weight="bold" aria-hidden />
              Create embed
            </Button>
          </>
        }
        toolbar={
          // Mounted in every state, including the cold load: a filter that
          // disappears while its own query runs strands the user mid-decision.
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <FilterPills<WidgetListFilter>
              aria-label="Filter widgets by kind"
              options={FILTERS.map((f) => ({
                ...f,
                // Absent until the list answers; a zero is then a real zero and
                // simply reads as an empty pill rather than a fabricated count.
                count: counts ? counts[f.id] || null : null,
              }))}
              value={filter}
              onChange={(next) =>
                setQuery({ type: next === "all" ? null : next })
              }
              size="sm"
            />
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>
        }
      />

      <PageBody padding="bare" className="min-h-0 overflow-y-auto">
        <DataState
          state={state}
          resource="widgets"
          skeleton={
            viewMode === "grid" ? (
              <div className="px-4 py-5 sm:px-6">
                <GridSkeleton tiles={6} />
              </div>
            ) : (
              <ListSkeleton rows={6} leading="square" trailing />
            )
          }
          empty={
            <WidgetEmptyState onPick={(kind) => setQuery({ new: kind })} />
          }
          filteredEmpty={
            filter === "all" ? undefined : (
              <KindEmpty
                kind={filter}
                onClear={() => setQuery({ type: null })}
              />
            )
          }
        >
          {/* The widgets endpoint returns a project's complete widget list —
              there is no paginated envelope, so there is no page affordance to
              render. If it ever grows one, pass it to `DataList.pagination`. */}
          {viewMode === "grid" ? (
            <div className="px-4 py-5 sm:px-6">
              <div
                role="list"
                aria-label="Widgets"
                className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
              >
                {visible.map((entry) => (
                  <div key={entry.id} role="listitem" className="h-full">
                    <WidgetCard
                      {...itemProps(entry)}
                      previewConfig={configById.get(entry.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <DataList aria-label="Widgets">
              {visible.map((entry) => (
                <WidgetRow key={entry.id} {...itemProps(entry)} />
              ))}
            </DataList>
          )}
        </DataState>
      </PageBody>

      <WidgetKindPicker
        open={pickerOpen}
        onOpenChange={(open) => {
          if (!open) setQuery({ new: null });
        }}
        onCreate={(opts) => void handleCreate(opts)}
        initialKind={initialKind}
        projectBrandColor={project.brandColorPrimary}
      />
    </div>
  );
}

/** The public wall address lives on the widget's own saved definition. */
function wallSlugFor(config: WidgetStudioConfig | undefined): string | null {
  const slug = config?.wall.slug?.trim();
  return slug ? slug : null;
}

/**
 * Stamp the chosen template as draft version 0. Deliberately best-effort and
 * swallowed: the widget already exists and the studio hydrates whatever is
 * saved, so failing here must not strand the user on a dead route.
 */
async function stampTemplate({
  token,
  slug,
  widgetId,
  definition,
  templateId,
  brandAccent,
}: {
  token: string | null;
  slug: string;
  widgetId: string;
  definition: unknown;
  templateId: string;
  brandAccent: string;
}) {
  if (!templateId) return;
  try {
    // Seed from the server's definition — it owns the generated wall slug —
    // and patch only the template and the brand facts.
    const draft = widgetDefinitionDocSchema.parse({
      ...(definition as Record<string, unknown>),
      templateId,
      accents: {},
      brand: { color: brandAccent, appearance: "system" },
    });
    await saveWidgetDraft(token, slug, widgetId, {
      draft: draft as unknown as Record<string, unknown>,
      expectedVersion: 0,
    });
  } catch {
    // Best-effort by design; the studio recovers from whatever is stored.
  }
}

function countByKind(entries: WidgetListEntry[]) {
  return {
    all: entries.length,
    embed: entries.filter((w) => w.kind === "embed").length,
    wall: entries.filter((w) => w.kind === "wall").length,
    paused: entries.filter((w) => !w.isActive).length,
  };
}

/**
 * The workspace plan caps how many widgets can exist. Reading it here is what
 * lets the surface disable both create actions with the reason attached, rather
 * than offering buttons whose only outcome is an API refusal.
 *
 * Deliberately fails open: if the usage query itself fails we don't know the
 * allowance, and blocking a paying owner on a failed side request would be the
 * worse error.
 */
function useCreateBlockedReason(): React.ReactNode | null {
  const usageQuery = useBillingUsage();
  const usage = usageQuery.data?.widgets;

  if (!usage || usage.limit <= 0 || usage.used < usage.limit) return null;

  return (
    <>
      {`Plan limit reached — ${fmtCount(usage.used)} of ${fmtCount(usage.limit)} ${
        usage.limit === 1 ? "widget" : "widgets"
      } in use. `}
      <Link
        href={accountBillingPath()}
        className="font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        Review plan
      </Link>
    </>
  );
}

/**
 * A filtered miss is a different fact from an empty project: this owner has
 * widgets, just none of this kind. Different copy, and one recovery — widen the
 * filter. Making the missing kind is not repeated here because both create
 * actions sit in the header in every state, and a third path to the same dialog
 * is a choice, not a help.
 */
function KindEmpty({
  kind,
  onClear,
}: {
  kind: "embed" | "wall";
  onClear: () => void;
}) {
  const isWall = kind === "wall";
  return (
    <NoResults
      title={isWall ? "No walls in this project" : "No embeds in this project"}
      description={
        isWall
          ? "A wall is a hosted page you share as a link — nothing to install."
          : "An embed drops into a site you already have, with one script tag."
      }
      action={
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={onClear}
        >
          Show all widgets
        </Button>
      }
    />
  );
}
