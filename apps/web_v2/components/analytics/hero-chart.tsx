"use client";

/**
 * HeroChart — the trend plot, and the only place series identity is defined.
 *
 * Three defects came out of this file having no registry. "Submissions" and
 * "Approvals" were separate pills bound to byte-identical key sets, so clicking
 * between them changed nothing on screen, and neither plotted submissions —
 * which the API had been sending all along. Two tab headings then described
 * series the chart did not contain. And the stacked bands were told apart by
 * colour alone, with no legend anywhere, on a green/red/amber triad.
 *
 * `METRIC_SERIES` is now the single source of series → colour → label, the
 * legend is rendered from it rather than written by hand, and the chart carries
 * an accessible name summarising the same numbers a sighted reader gets.
 */

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { fmtCount } from "@/lib/format";
import type { AnalyticsMetric, TimeseriesPoint } from "@/lib/analytics/types";

interface SeriesDef {
  key: keyof TimeseriesPoint;
  label: string;
  color: string;
}

interface MetricDef {
  /** What one point on the y axis counts. Stated in the caption, not per tick. */
  unit: string;
  stacked: boolean;
  series: SeriesDef[];
}

export const METRIC_SERIES: Record<AnalyticsMetric, MetricDef> = {
  collection: {
    unit: "per day",
    stacked: false,
    series: [
      {
        key: "formImpressions",
        label: "Form impressions",
        color: "var(--color-chart-3)",
      },
      { key: "submissions", label: "Submissions", color: "var(--color-brand)" },
    ],
  },
  moderation: {
    unit: "responses per day",
    stacked: true,
    series: [
      { key: "approved", label: "Approved", color: "var(--color-success)" },
      { key: "rejected", label: "Rejected", color: "var(--color-destructive)" },
      { key: "flagged", label: "Flagged", color: "var(--color-warning)" },
    ],
  },
  impressions: {
    unit: "impressions per day",
    stacked: false,
    series: [
      {
        key: "formImpressions",
        label: "Form impressions",
        color: "var(--color-brand)",
      },
      {
        key: "widgetImpressions",
        label: "Widget impressions",
        color: "var(--color-chart-3)",
      },
    ],
  },
  widgets: {
    unit: "impressions per day",
    stacked: false,
    series: [
      {
        key: "widgetImpressions",
        label: "Widget impressions",
        color: "var(--color-chart-3)",
      },
    ],
  },
};

const PREVIOUS_LABEL = "Previous period";
const DAY_MS = 24 * 60 * 60 * 1000;

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "6px",
  fontSize: 12,
  color: "var(--color-foreground)",
  padding: "8px 12px",
};

interface HeroChartProps {
  series: TimeseriesPoint[];
  prevSeries?: TimeseriesPoint[];
  metric: AnalyticsMetric;
  showComparison: boolean;
  className?: string;
}

type ChartRow = Record<string, string | number | null>;

function shortDay(date: string): string {
  // Anchored at midday so the label can't slip a day in either hemisphere.
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Fill every calendar day between the first and last point the API returned.
 * A day the API omitted becomes `null`, which recharts draws as a break in the
 * line — the rule is that a chart never interpolates across a gap, because a
 * straight line through a missing Tuesday asserts a number nobody measured.
 */
function continuousDays(series: TimeseriesPoint[]): (TimeseriesPoint | null)[] {
  if (series.length === 0) return [];
  const byDate = new Map(series.map((p) => [p.date, p]));
  const first = Date.parse(`${series[0].date}T00:00:00Z`);
  const last = Date.parse(`${series[series.length - 1].date}T00:00:00Z`);
  if (Number.isNaN(first) || Number.isNaN(last) || last < first) return series;

  const out: (TimeseriesPoint | null)[] = [];
  for (let t = first; t <= last; t += DAY_MS) {
    out.push(byDate.get(new Date(t).toISOString().slice(0, 10)) ?? null);
  }
  return out;
}

export function HeroChart({
  series,
  prevSeries,
  metric,
  showComparison,
  className,
}: HeroChartProps) {
  const def = METRIC_SERIES[metric];

  const { rows, totals } = React.useMemo(() => {
    const filled = continuousDays(series);
    const sums = new Map<string, number>(def.series.map((s) => [s.label, 0]));

    const built: ChartRow[] = filled.map((point, i) => {
      const date = point?.date ?? series[i]?.date ?? String(i);
      const row: ChartRow = { date };

      for (const s of def.series) {
        const value = point ? (point[s.key] as number) : null;
        row[s.label] = value;
        if (value !== null) sums.set(s.label, (sums.get(s.label) ?? 0) + value);
      }

      // The comparison overlays index-for-index. Where the previous period has
      // no matching day — a shorter month, a custom range, a gap in the API's
      // rows — the point is null, so the dashed line breaks instead of quietly
      // ending as if the value were zero.
      if (showComparison && prevSeries) {
        const prev = prevSeries[i];
        row[PREVIOUS_LABEL] = prev
          ? def.series.reduce((sum, s) => sum + (prev[s.key] as number), 0)
          : null;
      }
      return row;
    });

    return { rows: built, totals: sums };
  }, [series, prevSeries, showComparison, def]);

  const label = [
    `${def.series.length === 1 ? "Area" : "Stacked area"} chart, ${def.unit}.`,
    ...def.series.map(
      (s) => `${s.label}: ${fmtCount(totals.get(s.label) ?? 0)}`,
    ),
    rows.length > 0
      ? `${shortDay(String(rows[0].date))} to ${shortDay(String(rows[rows.length - 1].date))}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const tickStep = rows.length > 14 ? Math.floor(rows.length / 6) : 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Series identity is text first: colour alone is unreadable for the
          green/red/amber triad this chart uses most. */}
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {def.series.map((s) => (
          <li
            key={s.label}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-[2px]"
              style={{ background: s.color }}
            />
            {s.label}
            <span className="font-medium tabular-nums text-foreground">
              {fmtCount(totals.get(s.label) ?? 0)}
            </span>
          </li>
        ))}
        {showComparison && (
          <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              aria-hidden
              className="h-px w-4 shrink-0 border-t border-dashed border-muted-foreground"
            />
            {PREVIOUS_LABEL}
          </li>
        )}
      </ul>

      <div role="img" aria-label={label} style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={rows}
            margin={{ top: 8, right: 4, bottom: 0, left: -18 }}
          >
            <defs>
              {def.series.map((s) => (
                <linearGradient
                  key={s.key}
                  id={`hero-${metric}-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={s.color}
                    stopOpacity={def.stacked ? 0.6 : 0.28}
                  />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              vertical={false}
              opacity={0.5}
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{
                fontSize: 11,
                fill: "var(--color-muted-foreground)",
                fontFamily: "var(--font-mono)",
              }}
              tickFormatter={shortDay}
              interval={tickStep > 0 ? tickStep : "preserveStartEnd"}
            />
            {/* An area axis starts at zero — a truncated baseline exaggerates
                every movement on it. */}
            <YAxis
              domain={[0, "auto"]}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{
                fontSize: 11,
                fill: "var(--color-muted-foreground)",
                fontFamily: "var(--font-mono)",
              }}
              width={44}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={(value: unknown) => shortDay(String(value))}
              cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
            />

            {def.series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.label}
                stackId={def.stacked ? "stack" : undefined}
                stroke={s.color}
                strokeWidth={1.5}
                fill={`url(#hero-${metric}-${s.key})`}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
            {showComparison && (
              <Area
                type="monotone"
                dataKey={PREVIOUS_LABEL}
                stroke="var(--color-muted-foreground)"
                strokeWidth={1}
                strokeDasharray="4 3"
                fill="none"
                dot={false}
                activeDot={{ r: 2, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Counted {def.unit}. A break in a line is a day the API returned no row,
        not a zero.
      </p>
    </div>
  );
}
