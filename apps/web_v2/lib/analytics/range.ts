import type { AnalyticsRange, DateRange } from "./types";

export const RANGE_LABELS: Record<AnalyticsRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  mtd: "Month to date",
  qtd: "Quarter to date",
  ytd: "Year to date",
  custom: "Custom range",
};

export const RANGE_PRESETS: AnalyticsRange[] = [
  "7d",
  "30d",
  "90d",
  "mtd",
  "qtd",
  "ytd",
];

export function resolveRange(
  range: AnalyticsRange,
  customFrom?: string,
  customTo?: string,
): DateRange {
  const now = new Date();
  const today = startOfDay(now);

  if (range === "custom" && customFrom && customTo) {
    return {
      from: new Date(customFrom),
      to: new Date(customTo + "T23:59:59.999Z"),
    };
  }

  switch (range) {
    case "7d":
      return { from: subDays(today, 7), to: endOfDay(now) };
    case "30d":
      return { from: subDays(today, 30), to: endOfDay(now) };
    case "90d":
      return { from: subDays(today, 90), to: endOfDay(now) };
    case "mtd": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from, to: endOfDay(now) };
    }
    case "qtd": {
      const month = today.getMonth();
      const quarterStart = Math.floor(month / 3) * 3;
      const from = new Date(today.getFullYear(), quarterStart, 1);
      return { from, to: endOfDay(now) };
    }
    case "ytd": {
      const from = new Date(today.getFullYear(), 0, 1);
      return { from, to: endOfDay(now) };
    }
    default:
      return { from: subDays(today, 30), to: endOfDay(now) };
  }
}

export function getPreviousPeriod(range: DateRange): DateRange {
  const duration = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - duration),
    to: new Date(range.from.getTime() - 1),
  };
}

export function getRangeDays(range: DateRange): number {
  return Math.ceil(
    (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function formatRangeLabel(
  range: AnalyticsRange,
  from?: Date,
  to?: Date,
): string {
  if (range === "custom" && from && to) {
    return `${formatDate(from)} – ${formatDate(to)}`;
  }
  return RANGE_LABELS[range];
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export function formatDelta(
  current: number,
  prev: number,
): {
  delta: number;
  direction: "up" | "down" | "flat";
  label: string;
} {
  if (prev === 0) {
    return { delta: 0, direction: "flat", label: "—" };
  }
  const delta = ((current - prev) / prev) * 100;
  const direction = delta > 0.5 ? "up" : delta < -0.5 ? "down" : "flat";
  const sign = delta > 0 ? "+" : "";
  return {
    delta,
    direction,
    label: `${sign}${delta.toFixed(1)}%`,
  };
}

export function formatMetricValue(
  value: number,
  unit?: string,
  isRate?: boolean,
): string {
  if (isRate) return `${value.toFixed(1)}%`;
  if (unit === "ms") return `${Math.round(value)}ms`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString("en-US");
}

// ── Date helpers ──

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}
