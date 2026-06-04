"use client";

import Link from "next/link";
import { Star, ArrowUpRight, Eye } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { ContentPerformanceRow } from "@/lib/analytics/types";
interface ContentPerformanceTableProps {
  rows: ContentPerformanceRow[];
  projectSlug: string;
  compact?: boolean;
}

export function ContentPerformanceTable({
  rows,
  projectSlug,
  compact = false,
}: ContentPerformanceTableProps) {
  const displayed = compact ? rows.slice(0, 5) : rows;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Top performing
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">By impressions</p>
        </div>
        {compact && rows.length > 5 && (
          <Link
            href={`/projects/${projectSlug}/responses`}
            className="text-[11px] text-muted-foreground underline-offset-2 hover:underline shrink-0"
          >
            View all
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No responses yet.</p>
      ) : (
        <div className="space-y-0">
          {displayed.map((row, i) => {
            return (
              <Link
                key={row.id}
                href={`/projects/${projectSlug}/responses/${row.id}`}
                className={cn(
                  "group flex items-center gap-3 py-3 transition-colors duration-150",
                  "hover:bg-accent/30 -mx-2 px-2 rounded",
                  i < displayed.length - 1 && "border-b border-border/40",
                )}
              >
                <span className="text-[11px] font-medium text-muted-foreground tabular-nums w-4 shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {row.authorName}
                    </p>
                    {row.authorCompany && (
                      <span className="text-[10px] text-muted-foreground truncate hidden sm:block">
                        · {row.authorCompany}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {row.content}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {row.rating !== null && (
                    <div className="flex items-center gap-0.5">
                      <Star weight="fill" className="size-2.5 text-brand/70" />
                      <span className="text-[11px] tabular-nums font-mono text-muted-foreground">
                        {row.rating}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-0.5">
                    <Eye
                      weight="regular"
                      className="size-3 text-muted-foreground"
                    />
                    <span className="text-[11px] tabular-nums font-mono font-semibold text-foreground">
                      {row.impressions.toLocaleString("en-US")}
                    </span>
                  </div>
                  <ArrowUpRight
                    weight="regular"
                    className="size-3 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
