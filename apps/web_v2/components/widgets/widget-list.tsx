"use client";

/**
 * WidgetList — gallery page client component.
 *
 * Pulls widgets + snapshots from the studio store, ensures the project is
 * seeded, and renders the gallery grid + filter strip + empty state.
 */

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
// Phosphor icons now expects Icon suffixed imports. Pure "Plus" is deprecated.
import {
  PlusIcon,
  GlobeIcon,
  CodeIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeader,
  HeaderSep,
  HeaderCaption,
  FilterPills as SharedFilterPills,
  PageBody,
} from "@/components/shared";
import {
  getApprovedTestimonialsByProject,
  type MockProject,
} from "@/lib/mock-data";
import { selectPreviewTestimonials } from "@/lib/widgets/widget-fallback-testimonials";
import {
  useWidgetStudioStore,
  isWidgetDirty,
} from "@/lib/widgets/widget-studio-store";
import type { WidgetKind } from "@/lib/widgets/widget-types";
import { WidgetCard } from "./widget-card";
import { WidgetEmptyState } from "./widget-empty-state";
import { WidgetKindPicker } from "./widget-kind-picker";

type Filter = "all" | "embed" | "wall";

interface WidgetListProps {
  project: MockProject;
}

function GalleryGridSkeleton() {
  return (
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
  );
}

export function WidgetList({ project }: WidgetListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filter state — URL synced.
  const filterParam = (searchParams.get("type") ?? "all") as Filter;
  const filter: Filter = ["all", "embed", "wall"].includes(filterParam)
    ? filterParam
    : "all";

  // Kind picker state — URL synced.
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

  // Store selectors.
  const widgets = useWidgetStudioStore((s) => s.widgetsByProject[project.slug]);
  const snapshots = useWidgetStudioStore((s) => s.snapshots);
  const ensureProject = useWidgetStudioStore((s) => s.ensureProject);
  const createWidget = useWidgetStudioStore((s) => s.createWidget);
  const deleteWidget = useWidgetStudioStore((s) => s.deleteWidget);
  const duplicateWidget = useWidgetStudioStore((s) => s.duplicateWidget);
  const updateWidgetEntry = useWidgetStudioStore((s) => s.updateWidgetEntry);

  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    ensureProject(project.slug, { brandColor: project.brandColorPrimary });
    setHydrated(true);
  }, [project.slug, project.brandColorPrimary, ensureProject]);

  // Fixed preview testimonials per project (memoized — same reference across
  // re-renders so testimonial card memoization holds).
  const previewItems = React.useMemo(() => {
    const real = getApprovedTestimonialsByProject(project.id);
    const { items } = selectPreviewTestimonials(real, 8);
    return items;
  }, [project.id]);

  const list = widgets ?? [];
  const counts: Record<Filter, number> = {
    all: list.length,
    embed: list.filter((w) => w.kind === "embed").length,
    wall: list.filter((w) => w.kind === "wall").length,
  };

  const filtered =
    filter === "all" ? list : list.filter((w) => w.kind === filter);

  const handleCreate = React.useCallback(
    ({
      kind,
      layout,
    }: {
      kind: WidgetKind;
      layout?: import("@/lib/widgets/widget-types").WidgetLayout;
    }) => {
      const id = createWidget(project.slug, {
        kind,
        layout,
        brandColor: project.brandColorPrimary,
      });
      setQuery({ new: null });
      router.push(`/projects/${project.slug}/widgets/${id}?firstRun=1`);
    },
    [createWidget, project.slug, project.brandColorPrimary, setQuery, router],
  );

  const showToolbar = hydrated && list.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Widgets"
        description={
          hydrated ? (
            <>
              <span>
                {list.length} widget{list.length === 1 ? "" : "s"}
              </span>
              <HeaderSep />
              <span>{project.name}</span>
            </>
          ) : (
            project.name
          )
        }
        actions={
          showToolbar ? (
            <>
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
              >
                <PlusIcon className="size-3.5" weight="bold" aria-hidden />
                New embed
              </Button>
            </>
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
            </>
          ) : undefined
        }
      />

      {/* Body */}
      <PageBody padding="compact" className="overflow-y-auto">
        {!hydrated ? (
          <GalleryGridSkeleton />
        ) : list.length === 0 ? (
          <WidgetEmptyState onPick={(kind) => setQuery({ new: kind })} />
        ) : filtered.length === 0 ? (
          <FilteredEmpty
            kind={filter as Exclude<Filter, "all">}
            onCreate={() => setQuery({ new: filter as WidgetKind })}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((entry) => {
              const snap = snapshots[entry.id];
              if (!snap) return null;
              return (
                <WidgetCard
                  key={entry.id}
                  slug={project.slug}
                  entry={entry}
                  config={snap.draft}
                  items={previewItems}
                  hasDirtyDraft={isWidgetDirty(snap)}
                  onDuplicate={() => duplicateWidget(project.slug, entry.id)}
                  onDelete={() => deleteWidget(project.slug, entry.id)}
                  onToggleActive={() =>
                    updateWidgetEntry(project.slug, entry.id, {
                      isActive: !entry.isActive,
                    })
                  }
                  onRename={(name) =>
                    updateWidgetEntry(project.slug, entry.id, { name })
                  }
                />
              );
            })}
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
