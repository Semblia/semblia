"use client";

import Link from "next/link";
import { ShieldCheck, ArrowRight, Globe } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { SourceEntry } from "@/lib/analytics/types";

interface TopSourcesListProps {
  sources: SourceEntry[];
  projectSlug: string;
  compact?: boolean;
}

export function TopSourcesList({
  sources,
  projectSlug,
  compact = false,
}: TopSourcesListProps) {
  const maxCount = Math.max(...sources.map((s) => s.count), 1);
  const displayed = compact ? sources.slice(0, 5) : sources;

  if (sources.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-5">
        <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
          <div className="size-8 rounded-full bg-muted flex items-center justify-center mb-1">
            <Globe weight="regular" className="size-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No source data</p>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            Share your collection link to start tracking where submissions come
            from.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Top sources</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submission sources
          </p>
        </div>
        {compact && sources.length > 5 && (
          <Link
            href={`/projects/${projectSlug}/analytics?tab=sources`}
            className="text-[11px] text-muted-foreground underline-offset-2 hover:underline shrink-0"
          >
            View all
          </Link>
        )}
      </div>

      <div className="space-y-0">
        {displayed.map((src, i) => {
          const barWidth = (src.count / maxCount) * 100;
          const approvalPct = Math.round(src.approvalRate);

          return (
            <Link
              key={src.source}
              href={`/projects/${projectSlug}/testimonials?source=${src.source}`}
              className="group block"
            >
              <div
                className={cn(
                  "flex items-center gap-3 py-2.5 transition-colors duration-150",
                  i < displayed.length - 1 && "border-b border-border/50",
                  "hover:bg-accent/30 -mx-2 px-2 rounded",
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-medium text-foreground truncate">
                      {src.label}
                    </span>
                    {src.oauthVerified && (
                      <ShieldCheck
                        weight="fill"
                        className="size-3 shrink-0 text-success"
                        aria-label="OAuth verified"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                      {approvalPct}% approved
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm font-semibold tabular-nums font-mono text-foreground">
                    {src.count}
                  </span>
                  <ArrowRight
                    weight="regular"
                    className="size-3 text-muted-foreground opacity-0 -translate-x-0.5 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0"
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
