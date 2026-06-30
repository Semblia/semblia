import { CodeIcon, GlobeIcon, PlusIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  WidgetKind,
  WidgetListEntry,
  WidgetStudioConfig,
} from "@/lib/widgets/widget-types";
import { WidgetCard } from "./widget-card";
import { WidgetEmptyState } from "./widget-empty-state";
import { WidgetRow } from "./widget-row";

export type WidgetListFilter = "all" | "embed" | "wall";

interface WidgetListContentProps {
  projectSlug: string;
  loading: boolean;
  listCount: number;
  filtered: WidgetListEntry[];
  filter: WidgetListFilter;
  viewMode: "grid" | "list";
  configById: Map<string, WidgetStudioConfig>;
  onPick: (kind: WidgetKind) => void;
  onDuplicate: (widgetId: string) => void;
  onDelete: (widgetId: string) => void;
  onToggleActive: (widgetId: string, isActive: boolean) => void;
  onRename: (widgetId: string, name: string) => void;
}

type WidgetListActions = Pick<
  WidgetListContentProps,
  "onDuplicate" | "onDelete" | "onToggleActive" | "onRename"
>;

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

export function WidgetListContent({
  projectSlug,
  loading,
  listCount,
  filtered,
  filter,
  viewMode,
  configById,
  onPick,
  onDuplicate,
  onDelete,
  onToggleActive,
  onRename,
}: WidgetListContentProps) {
  if (loading) return <GalleryGridSkeleton />;
  if (listCount === 0) return <WidgetEmptyState onPick={onPick} />;
  if (filtered.length === 0 && filter !== "all") {
    return <FilteredEmpty kind={filter} onCreate={() => onPick(filter)} />;
  }

  return (
    <WidgetCollection
      projectSlug={projectSlug}
      viewMode={viewMode}
      entries={filtered}
      configById={configById}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onToggleActive={onToggleActive}
      onRename={onRename}
    />
  );
}

function WidgetCollection({
  projectSlug,
  viewMode,
  entries,
  configById,
  onDuplicate,
  onDelete,
  onToggleActive,
  onRename,
}: {
  projectSlug: string;
  viewMode: "grid" | "list";
  entries: WidgetListEntry[];
  configById: Map<string, WidgetStudioConfig>;
} & WidgetListActions) {
  const renderItem = (entry: WidgetListEntry) => {
    const commonProps = {
      slug: projectSlug,
      entry,
      previewConfig: configById.get(entry.id),
      wallSlug: null,
      hasDirtyDraft: false,
      onDuplicate: () => onDuplicate(entry.id),
      onDelete: () => onDelete(entry.id),
      onToggleActive: () => onToggleActive(entry.id, entry.isActive),
      onRename: (name: string) => onRename(entry.id, name),
    };

    if (viewMode === "list") {
      return (
        <div key={entry.id} role="listitem">
          <WidgetRow {...commonProps} />
        </div>
      );
    }

    return (
      <div key={entry.id} role="listitem" className="h-full">
        <WidgetCard {...commonProps} />
      </div>
    );
  };

  if (viewMode === "list") {
    return (
      <div className="divide-y divide-border" role="list" aria-label="Widgets">
        {entries.map(renderItem)}
      </div>
    );
  }

  return (
    <div className="px-4 py-5 sm:px-6">
      <div
        className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        role="list"
        aria-label="Widgets"
      >
        {entries.map(renderItem)}
      </div>
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
          ? "Walls are public hosted pages - perfect for sharing on socials."
          : "Embeds drop into any site with a single script tag."}
      </p>
      <Button size="sm" className="mt-1 gap-1.5 text-xs" onClick={onCreate}>
        <PlusIcon className="size-3.5" weight="bold" aria-hidden />
        Create {label.toLowerCase()}
      </Button>
    </div>
  );
}
