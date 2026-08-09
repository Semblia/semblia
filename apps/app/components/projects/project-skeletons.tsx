"use client";

/**
 * Cold-load placeholder for the grid view.
 *
 * The list view uses the shared `ListSkeleton` directly — its default density
 * is `ProjectRow`'s padding, so the swap causes no shift. The grid needed one
 * of its own: the shared `GridSkeleton` models a tile with a hero image strip,
 * and a project tile has an avatar, a name, a type line and a stat footer.
 * Rather than re-draw the tile chrome (`rounded-xl border bg-card`) and let the
 * two drift, this composes the real `ItemCard` shell and fills it with
 * `Skeleton`, so the placeholder inherits any change to the tile itself.
 */

import { ItemCard } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectGridSkeleton({ tiles = 6 }: { tiles?: number }) {
  return (
    <div
      aria-hidden
      className="grid grid-cols-1 gap-4 sm:auto-rows-fr sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: tiles }).map((_, i) => (
        <ItemCard
          key={i}
          nonInteractive
          footer={
            <div className="flex items-center border-t border-border/70 px-5 py-3.5">
              <Skeleton className="animate-shimmer h-3 w-28" />
              <Skeleton className="animate-shimmer ml-auto h-3 w-12" />
            </div>
          }
        >
          <div className="px-5 pt-5 pb-4">
            <Skeleton className="animate-shimmer size-10 rounded-lg" />
            <Skeleton className="animate-shimmer mt-3 h-3.5 w-28" />
            <Skeleton className="animate-shimmer mt-2 h-2.5 w-16" />
            <Skeleton className="animate-shimmer mt-2.5 h-2.5 w-44" />
          </div>
        </ItemCard>
      ))}
    </div>
  );
}
