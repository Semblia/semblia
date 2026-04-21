import { Skeleton } from "@/components/ui/skeleton";

// ── Skeleton states ────────────────────────────────────────────────────────────

export function ProjectRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <Skeleton className="size-9 shrink-0 rounded-lg animate-shimmer" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-36 animate-shimmer" />
        <Skeleton className="h-3 w-52 animate-shimmer" />
      </div>
      <div className="hidden items-center gap-5 sm:flex">
        <Skeleton className="h-3 w-12 animate-shimmer" />
        <Skeleton className="h-3 w-8 animate-shimmer" />
        <Skeleton className="h-3 w-8 animate-shimmer" />
        <Skeleton className="h-3 w-14 animate-shimmer" />
      </div>
    </div>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="rounded-xl ring-1 ring-foreground/[0.06] overflow-hidden">
      <Skeleton className="h-1 w-full animate-shimmer rounded-none" />
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 rounded-lg shrink-0 animate-shimmer" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-4 w-24 animate-shimmer" />
            <Skeleton className="h-3 w-40 animate-shimmer" />
          </div>
        </div>
        <div className="pt-3 border-t border-border flex items-center gap-4">
          <Skeleton className="h-3 w-16 animate-shimmer" />
          <Skeleton className="h-3 w-12 animate-shimmer" />
          <Skeleton className="ml-auto h-3 w-10 animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
