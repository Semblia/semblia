"use client";

import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus } from "@phosphor-icons/react";
import { Sparkline } from "./sparkline";
import { formatMetricValue, formatDelta } from "@/lib/analytics/range";
import type { KpiTile } from "@/lib/analytics/types";

interface StatTileProps {
  tile: KpiTile;
  showComparison?: boolean;
  className?: string;
}

export function StatTile({
  tile,
  showComparison = true,
  className,
}: StatTileProps) {
  const { direction, label: deltaLabel } = formatDelta(
    tile.value,
    tile.prevValue,
  );

  const deltaColor =
    direction === "up"
      ? "text-success"
      : direction === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  const DeltaIcon =
    direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;

  const displayValue = formatMetricValue(tile.value, tile.unit, tile.isRate);

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 rounded-lg border border-border bg-card px-4 pt-4 pb-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground leading-none">
          {tile.label}
        </p>
        {showComparison && direction !== "flat" && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
              deltaColor,
            )}
          >
            <DeltaIcon weight="bold" className="size-2.5 shrink-0" />
            {deltaLabel}
          </span>
        )}
      </div>

      <p
        className="text-[22px] font-medium text-foreground tabular-nums font-mono"
        style={{ letterSpacing: "-0.02em" }}
      >
        {displayValue}
      </p>

      <Sparkline
        series={tile.series}
        color="var(--color-brand)"
        height={28}
        className="mt-auto"
      />
    </div>
  );
}
