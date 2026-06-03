import { Skeleton } from "@/components/ui/skeleton";

export function ResponseSkeleton() {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <Skeleton className="mt-0.5 size-7 shrink-0 rounded-full animate-shimmer" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-24 animate-shimmer" />
          <Skeleton className="h-2.5 w-16 animate-shimmer" />
        </div>
        <Skeleton className="h-3 w-full max-w-[260px] animate-shimmer" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-12 rounded-full animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
