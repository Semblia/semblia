"use client";

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
import type { TimeseriesPoint } from "@/lib/analytics/types";
import type { AnalyticsMetric } from "@/lib/analytics/types";

interface HeroChartProps {
  series: TimeseriesPoint[];
  prevSeries?: TimeseriesPoint[];
  metric: AnalyticsMetric;
  showComparison: boolean;
  className?: string;
}

const METRIC_KEYS: Record<
  AnalyticsMetric,
  { key: keyof TimeseriesPoint; label: string }[]
> = {
  submissions: [
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "flagged", label: "Flagged" },
  ],
  approvals: [
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "flagged", label: "Flagged" },
  ],
  impressions: [
    { key: "formImpressions", label: "Form impressions" },
    { key: "widgetImpressions", label: "Widget impressions" },
  ],
  loadtime: [{ key: "avgLoadMs", label: "Avg load time (ms)" }],
};

const STACK_COLORS: Record<string, string> = {
  approved: "var(--color-success)",
  pending: "var(--color-brand)",
  rejected: "var(--color-destructive)",
  flagged: "var(--color-warning)",
  formImpressions: "var(--color-brand)",
  widgetImpressions: "var(--color-chart-3)",
  avgLoadMs: "var(--color-chart-3)",
};

interface ChartDataPoint {
  date: string;
  [key: string]: string | number | undefined;
}

function formatDateTick(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function HeroChart({
  series,
  prevSeries,
  metric,
  showComparison,
  className,
}: HeroChartProps) {
  const keys = METRIC_KEYS[metric];
  const isStacked = metric === "submissions" || metric === "approvals";

  // Build chart data
  const data: ChartDataPoint[] = series.map((p) => {
    const point: ChartDataPoint = { date: p.date };
    for (const { key, label } of keys) {
      point[label] = p[key] as number;
    }
    if (showComparison && prevSeries) {
      // Align previous period by offset
      const totalCur = p[keys[0].key] as number;
      point["prev_total"] = totalCur;
    }
    return point;
  });

  // Overlay previous period as total line
  let prevData: { date: string; prev: number }[] = [];
  if (showComparison && prevSeries) {
    prevData = prevSeries.map((p, i) => {
      const total = keys.reduce((s, { key }) => s + (p[key] as number), 0);
      return {
        date: series[i]?.date ?? p.date,
        prev: total,
      };
    });
  }

  // Merge prev into data
  const mergedData: ChartDataPoint[] = data.map((d, i) => ({
    ...d,
    ...(showComparison && prevData[i]
      ? { "Prev. period": prevData[i].prev }
      : {}),
  }));

  const skipDates = series.length > 14;

  return (
    <div className={cn("w-full", className)} style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={mergedData}
          margin={{ top: 8, right: 4, bottom: 0, left: -20 }}
        >
          <defs>
            {keys.map(({ label }) => (
              <linearGradient
                key={label}
                id={`hero-grad-${label.replace(/\s+/g, "")}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={
                    STACK_COLORS[
                      keys.find((k) => k.label === label)?.key ?? ""
                    ] ?? "var(--color-brand)"
                  }
                  stopOpacity={isStacked ? 0.6 : 0.3}
                />
                <stop
                  offset="100%"
                  stopColor={
                    STACK_COLORS[
                      keys.find((k) => k.label === label)?.key ?? ""
                    ] ?? "var(--color-brand)"
                  }
                  stopOpacity={0}
                />
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
            tickFormatter={formatDateTick}
            interval={
              skipDates ? Math.floor(series.length / 6) : "preserveStartEnd"
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{
              fontSize: 11,
              fill: "var(--color-muted-foreground)",
              fontFamily: "var(--font-mono)",
            }}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              fontSize: 12,
              color: "var(--color-foreground)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              padding: "8px 12px",
            }}
            labelFormatter={(label: unknown) => formatDateTick(String(label))}
            cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
          />
          {keys.map(({ label, key }) => (
            <Area
              key={label}
              type="monotone"
              dataKey={label}
              stackId={isStacked ? "stack" : undefined}
              stroke={STACK_COLORS[key] ?? "var(--color-brand)"}
              strokeWidth={1.5}
              fill={`url(#hero-grad-${label.replace(/\s+/g, "")})`}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          ))}
          {showComparison && (
            <Area
              type="monotone"
              dataKey="Prev. period"
              stroke="var(--color-muted-foreground)"
              strokeWidth={1}
              strokeDasharray="4 3"
              fill="none"
              dot={false}
              activeDot={{ r: 2, strokeWidth: 0 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
