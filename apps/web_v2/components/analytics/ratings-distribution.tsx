"use client";

import { Star } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { RatingsData } from "@/lib/analytics/types";

interface RatingsDistributionProps {
  data: RatingsData;
}

export function RatingsDistribution({ data }: RatingsDistributionProps) {
  const maxCount = Math.max(...Object.values(data.distribution), 1);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Ratings
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Score distribution
          </p>
        </div>
        {data.total > 0 && (
          <div className="text-right shrink-0">
            <div className="flex items-center gap-0.5 justify-end">
              <Star weight="fill" className="size-3.5 text-brand" />
              <span className="text-sm font-semibold tabular-nums font-[var(--font-mono)] text-foreground">
                {data.average}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {data.total} rated
            </span>
          </div>
        )}
      </div>

      {data.total === 0 ? (
        <p className="text-xs text-muted-foreground">No ratings yet.</p>
      ) : (
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = data.distribution[rating] ?? 0;
            const pct = data.total > 0 ? (count / data.total) * 100 : 0;
            const barWidth = (count / maxCount) * 100;

            return (
              <div key={rating} className="flex items-center gap-2.5">
                <div className="flex items-center gap-0.5 w-6 shrink-0">
                  <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                    {rating}
                  </span>
                  <Star
                    weight="fill"
                    className="size-2.5 text-brand/60 shrink-0"
                  />
                </div>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      rating >= 4
                        ? "bg-success/80"
                        : rating === 3
                          ? "bg-brand/60"
                          : "bg-destructive/50",
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="flex items-center gap-1 w-12 shrink-0 justify-end">
                  <span className="text-[11px] text-muted-foreground tabular-nums font-[var(--font-mono)]">
                    {count}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    ({Math.round(pct)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
