import { fmtCount, isFiniteNumber } from "@/lib/format";
import type { AnalyticsRange, DateRange, MetricPair } from "./types";

/**
 * Range resolution and the number formatting the analytics surface shares.
 *
 * Three defects lived here and all were about honesty rather than arithmetic:
 * `formatDelta` returned "flat" whenever the previous period was zero, so a
 * project going 0 → 500 submissions showed no movement at all; custom ranges
 * mixed local and UTC parsing across the two ends of one span, shifting the
 * start date by a day for anyone east of Greenwich; and a custom range ending
 * in the past was requested as a trailing window of the same length while the
 * picker displayed the historical dates (see `resolveRange`).
 */

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

export const DEFAULT_RANGE: AnalyticsRange = "30d";

/**
 * The furthest back the API will aggregate. The picker disables earlier dates
 * rather than accepting them and silently clamping, which used to leave the
 * trigger reading "Jan 1, 2020 – Jul 27, 2026" over 365 days of data.
 */
export const MAX_RANGE_DAYS = 365;

export function isAnalyticsRange(value: string): value is AnalyticsRange {
  return value in RANGE_LABELS;
}

/**
 * Parse a `YYYY-MM-DD` string as a *local* calendar day. `new Date("2026-07-27")`
 * is UTC midnight, which is the previous day for anyone at a positive offset —
 * the same bug from the other direction.
 */
export function parseLocalDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a local calendar day back to `YYYY-MM-DD` without a timezone shift. */
export function formatLocalDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * A malformed custom range resolves to `null` and falls back to the default
 * rather than producing an Invalid Date that would reach the request as `NaN`.
 *
 * The end is pinned to now, and that is not a clamp — it is the contract.
 * `GET /analytics/dashboard` takes a day *count* and aggregates backwards
 * from the request, with no `since`/`until`. A window ending in the past
 * was therefore sent as the same number of days ending *today* while the
 * trigger went on displaying the historical dates the user picked: the
 * numbers on screen described a period the label denied. The picker now
 * refuses to build such a window, and a hand-edited URL is normalised here
 * so the label and the request can never disagree.
 */
function resolveCustomRange(
  customFrom: string | undefined,
  customTo: string | undefined,
  today: Date,
  now: Date,
): DateRange | null {
  const from = customFrom ? parseLocalDay(customFrom) : null;
  const to = customTo ? parseLocalDay(customTo) : null;
  if (!from || !to) return null;
  if (from.getTime() > today.getTime()) return null;
  return { from: startOfDay(from), to: endOfDay(now) };
}

export function resolveRange(
  range: AnalyticsRange,
  customFrom?: string,
  customTo?: string,
): DateRange {
  const now = new Date();
  const today = startOfDay(now);

  if (range === "custom") {
    const custom = resolveCustomRange(customFrom, customTo, today, now);
    if (custom) return custom;
  }

  switch (range) {
    case "7d":
      return { from: subDays(today, 7), to: endOfDay(now) };
    case "90d":
      return { from: subDays(today, 90), to: endOfDay(now) };
    case "mtd": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from, to: endOfDay(now) };
    }
    case "qtd": {
      const quarterStart = Math.floor(today.getMonth() / 3) * 3;
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

export function getRangeDays(range: DateRange): number {
  return Math.ceil(
    (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24),
  );
}

/** Days actually requested from the API — clamped to what it can aggregate. */
export function requestDays(range: DateRange): number {
  return Math.min(Math.max(getRangeDays(range), 1), MAX_RANGE_DAYS);
}

export function formatRangeLabel(
  range: AnalyticsRange,
  from?: Date,
  to?: Date,
): string {
  if (range === "custom" && from && to) {
    return `${formatDate(from)} – ${formatDate(to)}`;
  }
  return RANGE_LABELS[range] ?? RANGE_LABELS[DEFAULT_RANGE];
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

// ── Comparison ───────────────────────────────────────────────────────────────

export interface MetricComparison {
  /** Percent change, in the shape `MetricValue.delta` takes. */
  delta: { value: number; label: string } | null;
  /**
   * What to say when a percentage would be a lie. Growth from zero has no
   * percentage, and a missing previous period is not a flat one — both used to
   * render as nothing at all, which is how 0 → 500 looked like no change.
   */
  note: string | null;
}

const NO_COMPARISON: MetricComparison = { delta: null, note: null };

export function compareMetric(
  pair: MetricPair,
  { enabled = true }: { enabled?: boolean } = {},
): MetricComparison {
  if (!enabled) return NO_COMPARISON;

  const { current, previous } = pair;
  if (current === null) return NO_COMPARISON;
  if (previous === null) {
    return { delta: null, note: "No previous period to compare" };
  }
  if (previous === 0) {
    return current > 0
      ? { delta: null, note: "New — nothing in the previous period" }
      : NO_COMPARISON;
  }

  const raw = ((current - previous) / previous) * 100;
  const value = Math.round(raw * 10) / 10;
  if (value === 0) {
    return { delta: null, note: "No change from the previous period" };
  }

  return {
    delta: {
      value,
      label: `${value > 0 ? "Up" : "Down"} ${Math.abs(value)}% from ${fmtCount(previous)} in the previous period`,
    },
    note: null,
  };
}

// ── Number formatting ────────────────────────────────────────────────────────

/**
 * One percent formatter, one precision. Four sibling panels used to round to
 * three different precisions on the same screen.
 */
export function fmtPercent(
  value: number | null | undefined,
  fractionDigits = 1,
): string | null {
  if (!isFiniteNumber(value)) return null;
  return `${value.toFixed(fractionDigits)}%`;
}

/** Milliseconds as a duration, or `null` when there is nothing to report. */
export function fmtMillis(value: number | null | undefined): string | null {
  if (!isFiniteNumber(value)) return null;
  return `${Math.round(value)} ms`;
}

/** Hours as a readable duration: `42m`, `3.5h`, `2.1d`. */
export function fmtHours(value: number | null | undefined): string | null {
  if (!isFiniteNumber(value)) return null;
  if (value < 1) return `${Math.round(value * 60)}m`;
  if (value < 48) return `${value.toFixed(1)}h`;
  return `${(value / 24).toFixed(1)}d`;
}

// ── Date helpers ─────────────────────────────────────────────────────────────

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
