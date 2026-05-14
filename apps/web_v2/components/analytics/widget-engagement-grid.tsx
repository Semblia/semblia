"use client";

import Link from "next/link";
import {
  Clock,
  Lightning,
  ArrowUpRight,
  Warning,
  Gauge,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { WidgetEngagementData } from "@/lib/analytics/types";
import { timeAgo } from "@/lib/format";

interface WidgetEngagementGridProps {
  widgets: WidgetEngagementData[];
  projectSlug: string;
  compact?: boolean;
}

const LAYOUT_LABELS: Record<string, string> = {
  CAROUSEL: "Carousel",
  GRID: "Grid",
  MASONRY: "Masonry",
  LIST: "List",
  WALL: "Wall",
};

const TYPE_LABELS: Record<string, string> = {
  EMBED: "Embed",
  WALL_OF_LOVE: "Wall of Love",
};

export function WidgetEngagementGrid({
  widgets,
  projectSlug,
  compact = false,
}: WidgetEngagementGridProps) {
  const displayed = compact ? widgets.slice(0, 4) : widgets;

  if (widgets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-5">
        <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
          <div className="size-8 rounded-full bg-muted flex items-center justify-center mb-1">
            <Gauge weight="regular" className="size-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No widgets yet</p>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            Create a widget to start tracking load time and impressions.
          </p>
        </div>
      </div>
    );
  }

  const loadThreshold = 400;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Widget engagement
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Load &amp; impressions
          </p>
        </div>
        {compact && widgets.length > 4 && (
          <Link
            href={`/projects/${projectSlug}/analytics?tab=engagement`}
            className="text-[11px] text-muted-foreground underline-offset-2 hover:underline shrink-0"
          >
            View all
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {displayed.map((w) => {
          const isSlowLoad = w.avgLoadMs > loadThreshold;
          const hasErrors = w.errorCount > 0;

          return (
            <Link
              key={w.widgetId}
              href={`/projects/${projectSlug}/widgets/${w.widgetId}`}
              className={cn(
                "group block rounded-lg border bg-card p-4",
                "transition-[colors,shadow,transform] duration-150 hover:shadow-sm hover:border-border/70 active:scale-[0.99]",
                isSlowLoad ? "border-warning/30" : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {w.widgetName}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {TYPE_LABELS[w.widgetType] ?? w.widgetType}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-[10px] text-muted-foreground">
                      {LAYOUT_LABELS[w.layoutType] ?? w.layoutType}
                    </span>
                  </div>
                </div>
                <ArrowUpRight
                  weight="regular"
                  className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-all duration-150 group-hover:opacity-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-muted/50 px-2.5 py-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Lightning
                      weight="fill"
                      className="size-2.5 text-brand/70"
                    />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Loads
                    </span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums font-mono text-foreground">
                    {w.totalLoads.toLocaleString("en-US")}
                  </span>
                </div>

                <div
                  className={cn(
                    "rounded-md px-2.5 py-2",
                    isSlowLoad ? "bg-warning/10" : "bg-muted/50",
                  )}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <Clock
                      weight="regular"
                      className={cn(
                        "size-2.5",
                        isSlowLoad ? "text-warning" : "text-muted-foreground",
                      )}
                    />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Avg load
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums font-mono",
                      isSlowLoad ? "text-warning" : "text-foreground",
                    )}
                  >
                    {w.avgLoadMs}ms
                  </span>
                </div>
              </div>

              {(hasErrors || w.lastLoadAt) && (
                <div className="mt-2.5 flex items-center justify-between">
                  {hasErrors ? (
                    <div className="flex items-center gap-1">
                      <Warning
                        weight="fill"
                        className="size-3 text-destructive/70"
                      />
                      <span className="text-[10px] text-destructive/70">
                        {w.errorCount} error{w.errorCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ) : (
                    <div />
                  )}
                  {w.lastLoadAt && (
                    <span className="text-[10px] text-muted-foreground">
                      Last seen {timeAgo(w.lastLoadAt)}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
