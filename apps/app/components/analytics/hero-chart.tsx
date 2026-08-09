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

const AXIS_TICK = {
  fontSize: 11,
  fill: "var(--color-muted-foreground)",
  fontFamily: "var(--font-mono)",
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
  if (Number.isNaN(first) || Number.isNaN(last)) return series;
  if (last < first) return series;

  const out: (TimeseriesPoint | null)[] = [];
  for (let t = first; t <= last; t += DAY_MS) {
    out.push(byDate.get(new Date(t).toISOString().slice(0, 10)) ?? null);
  }
  return out;
}

/**
 * The comparison overlays index-for-index. Where the previous period has no
 * matching day — a shorter month, a custom range, a gap in the API's rows —
 * the point is null, so the dashed line breaks instead of quietly ending as
 * if the value were zero.
 */
function previousTotal(
  prev: TimeseriesPoint | undefined,
  seriesDefs: SeriesDef[],
): number | null {
  if (!prev) return null;
  return seriesDefs.reduce((sum, s) => sum + (prev[s.key] as number), 0);
}

/** One row per calendar day, keyed by series label so recharts, the tooltip,
 *  and the legend all read the same names. */
function chartRows(
  series: TimeseriesPoint[],
  prevSeries: TimeseriesPoint[] | undefined,
  showComparison: boolean,
  def: MetricDef,
): ChartRow[] {
  return continuousDays(series).map((point, i) => {
    const row: ChartRow = { date: point?.date ?? series[i]?.date ?? String(i) };
    for (const s of def.series) {
      row[s.label] = point ? (point[s.key] as number) : null;
    }
    if (showComparison && prevSeries) {
      row[PREVIOUS_LABEL] = previousTotal(prevSeries[i], def.series);
    }
    return row;
  });
}

/** Per-series sums for the legend and the accessible name. A null point is a
 *  missing day, not a zero, so it is skipped rather than counted. */
function seriesTotals(
  rows: ChartRow[],
  seriesDefs: SeriesDef[],
): Map<string, number> {
  const sums = new Map<string, number>(seriesDefs.map((s) => [s.label, 0]));
  for (const row of rows) {
    for (const s of seriesDefs) {
      const value = row[s.label];
      if (typeof value === "number") {
        sums.set(s.label, (sums.get(s.label) ?? 0) + value);
      }
    }
  }
  return sums;
}

/** The accessible name carries the same numbers a sighted reader gets from the
 *  legend, plus the span of days on the x axis. */
function chartAriaLabel(
  def: MetricDef,
  totals: Map<string, number>,
  rows: ChartRow[],
): string {
  return [
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
}

/** Series identity is text first: colour alone is unreadable for the
 *  green/red/amber triad this chart uses most. */
function ChartLegend({
  def,
  totals,
  showComparison,
}: {
  def: MetricDef;
  totals: Map<string, number>;
  showComparison: boolean;
}) {
  return (
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
  );
}

/** Plain functions, not components: recharts only recognises its own element
 *  types as chart children, so these must return the `<linearGradient>` and
 *  `<Area>` elements directly. */
function seriesGradients(def: MetricDef, metric: AnalyticsMetric) {
  return def.series.map((s) => (
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
  ));
}

function seriesAreas(def: MetricDef, metric: AnalyticsMetric) {
  return def.series.map((s) => (
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
  ));
}

function HeroPlot({
  rows,
  def,
  metric,
  showComparison,
}: {
  rows: ChartRow[];
  def: MetricDef;
  metric: AnalyticsMetric;
  showComparison: boolean;
}) {
  const tickStep = rows.length > 14 ? Math.floor(rows.length / 6) : 0;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={rows}
        margin={{ top: 8, right: 4, bottom: 0, left: -18 }}
      >
        <defs>{seriesGradients(def, metric)}</defs>

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
          tick={AXIS_TICK}
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
          tick={AXIS_TICK}
          width={44}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(value: unknown) => shortDay(String(value))}
          cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
        />

        {seriesAreas(def, metric)}
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
  );
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
    const built = chartRows(series, prevSeries, showComparison, def);
    return { rows: built, totals: seriesTotals(built, def.series) };
  }, [series, prevSeries, showComparison, def]);

  return (
    <div className={cn("space-y-3", className)}>
      <ChartLegend def={def} totals={totals} showComparison={showComparison} />

      <div
        role="img"
        aria-label={chartAriaLabel(def, totals, rows)}
        style={{ height: 220 }}
      >
        <HeroPlot
          rows={rows}
          def={def}
          metric={metric}
          showComparison={showComparison}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        Counted {def.unit}. A break in a line is a day the API returned no row,
        not a zero.
      </p>
    </div>
  );
}
