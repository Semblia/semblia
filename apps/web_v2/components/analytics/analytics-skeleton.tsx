/**
 * The analytics cold-load placeholders — one set, used by both the route
 * fallback and the client's own loading state.
 *
 * There used to be two hand-maintained skeletons for this one surface and they
 * disagreed: the route's rendered a six-pill toolbar and 108px tiles, the
 * client's rendered no toolbar and 112px tiles, so first paint went skeleton A
 * → skeleton B → content and the tab strip appeared, vanished, and reappeared.
 * Both now render from here, and each shape matches the element it stands in
 * for, so the swap to real content causes no shift.
 */

import { PageBody, PageHeader } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";

/** Matches `MetricRow`'s hairline-separated four-up band. */
export function MetricBandSkeleton({ columns = 4 }: { columns?: 2 | 3 | 4 }) {
  const cols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <div
      aria-hidden
      className={`grid grid-cols-1 gap-px overflow-hidden bg-border ${cols}`}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="bg-background px-4 py-3.5 first:pl-0 sm:px-5">
          <Skeleton className="animate-shimmer h-3 w-24" />
          <Skeleton className="animate-shimmer mt-2 h-6 w-16" />
          <Skeleton className="animate-shimmer mt-1.5 h-2.5 w-28" />
        </div>
      ))}
    </div>
  );
}

/** Matches the trend chart's plot height plus its legend row. */
export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div aria-hidden className="space-y-3">
      <div className="flex flex-wrap gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="animate-shimmer h-3 w-24" />
        ))}
      </div>
      <Skeleton className="animate-shimmer w-full" style={{ height }} />
    </div>
  );
}

/**
 * Matches `DataTable`: a header rule, then rows at the same 40px rhythm the
 * real cells sit on.
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div aria-hidden className="w-full">
      <div className="flex items-center gap-4 border-b border-border py-2.5">
        <Skeleton className="animate-shimmer h-3 flex-1" />
        {Array.from({ length: columns - 1 }).map((_, i) => (
          <Skeleton key={i} className="animate-shimmer h-3 w-14 shrink-0" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b border-border/60 py-3 last:border-b-0"
        >
          <Skeleton className="animate-shimmer h-3.5 flex-1" />
          {Array.from({ length: columns - 1 }).map((_, i) => (
            <Skeleton key={i} className="animate-shimmer h-3.5 w-14 shrink-0" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Matches a stacked-proportion panel: one track, then labelled legend rows. */
export function BreakdownSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden className="space-y-3">
      <Skeleton className="animate-shimmer h-2 w-full rounded-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="animate-shimmer h-3 flex-1" />
          <Skeleton className="animate-shimmer h-3 w-10 shrink-0" />
          <Skeleton className="animate-shimmer h-3 w-10 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Matches the day × hour grid, including its row labels. */
export function HeatmapSkeleton() {
  return (
    <div aria-hidden className="space-y-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="animate-shimmer h-2.5 w-8 shrink-0" />
          <Skeleton className="animate-shimmer h-4 flex-1 rounded-[2px]" />
        </div>
      ))}
    </div>
  );
}

/**
 * The client's cold load: the same band-over-sections rhythm every tab renders,
 * so the swap to real content moves nothing.
 */
export function AnalyticsBodySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <MetricBandSkeleton />
      <div className="space-y-3">
        <Skeleton className="animate-shimmer h-3.5 w-28" />
        <Skeleton className="animate-shimmer h-2.5 w-64" />
        <ChartSkeleton />
      </div>
      <div className="space-y-3 border-t border-border pt-6">
        <Skeleton className="animate-shimmer h-3.5 w-36" />
        <Skeleton className="animate-shimmer h-2.5 w-72" />
        <TableSkeleton rows={4} />
      </div>
    </div>
  );
}

/**
 * The route-level fallback. The title is static, so it renders as itself rather
 * than as a shimmer of the word "Analytics"; only the parts that depend on the
 * URL and the payload are placeholders.
 */
export function AnalyticsPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Analytics"
        description={<Skeleton className="animate-shimmer h-3 w-44" />}
        actions={<Skeleton className="animate-shimmer h-8 w-32 rounded-md" />}
        toolbar={
          <div className="flex gap-6 py-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="animate-shimmer h-3.5 w-16" />
            ))}
          </div>
        }
      />
      <PageBody padding="compact" stack>
        <MetricBandSkeleton />
        <div className="space-y-3">
          <Skeleton className="animate-shimmer h-3.5 w-28" />
          <ChartSkeleton />
        </div>
      </PageBody>
    </div>
  );
}
