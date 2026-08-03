"use client";

/**
 * SubmissionHeatmap — when submissions actually arrive.
 *
 * With no data this used to render a complete, authoritative 7 × 24 grid plus a
 * "Fewer → More" legend: every cell resolved to zero and painted, so a
 * brand-new project saw a fully-formed analytics visual asserting that it had
 * measured 168 hours of nothing. It has no empty branch of its own now either —
 * the panel's `DataState` owns that, driven by the cell count, which is what
 * makes "no submissions yet" and "the fetch failed" impossible to confuse.
 *
 * Two other repairs: the hour labels lived in their own flex track measured in
 * eighths of the container while the cells lost 23 gap pixels to `gap-px`, so
 * labels drifted about a full cell right by the end of the row — both tracks
 * are now columns of one grid. And the scale is readable: the legend carries
 * the actual counts instead of the words "Fewer" and "More".
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { fmtCount } from "@/lib/format";
import type { HeatmapCell } from "@/lib/analytics/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const LABELLED_HOURS = new Set([0, 3, 6, 9, 12, 15, 18, 21]);

function formatHour(hour: number): string {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

/** `color-mix` against the brand ink, with zero left as the muted track. */
function cellTint(count: number, max: number): string | undefined {
  if (count === 0) return undefined;
  // A floor of 20% keeps a single submission visible without making 1 and 2
  // indistinguishable — the old ramp started at 15% *and* compressed the rest.
  const intensity = max > 0 ? count / max : 0;
  const percent = Math.round(20 + intensity * 80);
  return `color-mix(in oklch, var(--color-brand) ${percent}%, transparent)`;
}

function submissionsNoun(count: number): string {
  return count === 1 ? "submission" : "submissions";
}

/**
 * The DTO types `day` as a bare number. Anything outside the week is dropped
 * rather than silently shifting every row by one.
 */
function inWeekGrid(cell: HeatmapCell): boolean {
  // Fractional coordinates build a key no grid square ever looks up, so they
  // have to fail here rather than vanish silently at render.
  const dayInWeek =
    Number.isInteger(cell.day) && cell.day >= 0 && cell.day <= 6;
  const hourInDay =
    Number.isInteger(cell.hour) && cell.hour >= 0 && cell.hour <= 23;
  return dayInWeek && hourInDay;
}

function summarizeCells(data: HeatmapCell[]): {
  cells: Map<string, number>;
  max: number;
  busiest: HeatmapCell | null;
  total: number;
} {
  const map = new Map<string, number>();
  let peak = 0;
  let top: HeatmapCell | null = null;
  let sum = 0;

  for (const cell of data) {
    if (!inWeekGrid(cell)) continue;
    map.set(`${cell.day}-${cell.hour}`, cell.count);
    sum += cell.count;
    if (cell.count > peak) {
      peak = cell.count;
      top = cell;
    }
  }
  return { cells: map, max: peak, busiest: top, total: sum };
}

export function SubmissionHeatmap({ data }: { data: HeatmapCell[] }) {
  // The total counts what the grid actually draws — summing the raw rows would
  // let the caption claim more than the squares below it show.
  const { cells, max, busiest, total } = React.useMemo(
    () => summarizeCells(data),
    [data],
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {busiest ? (
          <>
            Busiest hour:{" "}
            <strong className="font-medium text-foreground">
              {DAYS[busiest.day]} {formatHour(busiest.hour)}
            </strong>{" "}
            with {fmtCount(busiest.count)} {submissionsNoun(busiest.count)}, of{" "}
            {fmtCount(total)} in this range.
          </>
        ) : (
          <>No hour in this range recorded a submission.</>
        )}
      </p>

      <div className="overflow-x-auto">
        <div
          role="img"
          aria-label={`Submissions by day and hour. ${
            busiest
              ? `Busiest ${DAYS[busiest.day]} at ${formatHour(busiest.hour)} with ${fmtCount(busiest.count)}.`
              : "No submissions recorded."
          } ${fmtCount(total)} in total.`}
          className="grid min-w-[560px] grid-cols-[2.25rem_repeat(24,minmax(0,1fr))] gap-px"
        >
          {/* Hour labels share the cell grid, so a label can never drift out of
              alignment with the column it names. */}
          <span aria-hidden />
          {HOURS.map((hour) => (
            <span
              key={`label-${hour}`}
              aria-hidden
              className="pb-1 text-[11px] tabular-nums text-muted-foreground"
            >
              {LABELLED_HOURS.has(hour) ? formatHour(hour) : ""}
            </span>
          ))}

          {DAYS.map((day, dayIndex) => (
            <React.Fragment key={day}>
              <span
                aria-hidden
                className="self-center pr-2 text-[11px] font-medium text-muted-foreground"
              >
                {day}
              </span>
              {HOURS.map((hour) => {
                const count = cells.get(`${dayIndex}-${hour}`) ?? 0;
                return (
                  <span
                    key={`${dayIndex}-${hour}`}
                    aria-hidden
                    title={`${day} ${formatHour(hour)} · ${fmtCount(count)} ${submissionsNoun(count)}`}
                    className={cn(
                      "aspect-square rounded-[2px]",
                      count === 0 && "bg-muted/50",
                    )}
                    style={{ background: cellTint(count, max) }}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* The scale carries its endpoints as numbers: "Fewer → More" told the
          reader nothing about what a shade was worth. */}
      <div className="flex items-center justify-end gap-2 text-[11px] tabular-nums text-muted-foreground">
        <span>0</span>
        <span aria-hidden className="size-2.5 rounded-[2px] bg-muted/50" />
        {[0.25, 0.5, 0.75, 1].map((step) => (
          <span
            key={step}
            aria-hidden
            className="size-2.5 rounded-[2px]"
            style={{ background: cellTint(Math.max(step * max, 1), max) }}
          />
        ))}
        <span>{fmtCount(max)}</span>
      </div>
    </div>
  );
}
