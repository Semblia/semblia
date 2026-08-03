/**
 * The shapes the analytics surface renders from.
 *
 * Two contract rules govern every field here, because the old shapes broke both
 * and the panels inherited the lie:
 *
 *   1. **Absent is not zero.** Anything the API could not compute is `null`, so
 *      the surface can render an em dash instead of asserting `0`. The previous
 *      adapter collapsed "there is no previous period" into `previous: 0`, which
 *      made a real zero and a missing comparison pixel-identical.
 *   2. **Nothing is pre-formatted here.** Labels, hrefs, scales, and rounding
 *      belong to the component that knows the context; this layer carries facts.
 */

export type AnalyticsRange =
  | "7d"
  | "30d"
  | "90d"
  | "mtd"
  | "qtd"
  | "ytd"
  | "custom";

export type AnalyticsCompare = "prev" | "none";

/**
 * Which series the trend chart plots. Each value maps to a named set of series
 * in `hero-chart`, and every option a user can pick is offered by exactly one
 * pill list — "Submissions" and "Approvals" used to be separate pills bound to
 * byte-identical series, so clicking between them changed nothing.
 */
export type AnalyticsMetric =
  | "collection"
  | "moderation"
  | "impressions"
  | "widgets";

export type AnalyticsTab =
  | "overview"
  | "collection"
  | "pipeline"
  | "engagement"
  | "sources"
  | "api";

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * The rating scale the product collects on. Sourced from the API contract —
 * `V2AnalyticsRatingsDTO.distribution` is typed to buckets 1–5 — and used
 * everywhere a rating is rendered, because a bare `4` is a lie when the scale
 * is unknown.
 */
export const RATING_SCALE = 5;

export interface TimeseriesPoint {
  /** `YYYY-MM-DD`. */
  date: string;
  formImpressions: number;
  submissions: number;
  approved: number;
  rejected: number;
  flagged: number;
  widgetImpressions: number;
  avgLoadMs: number;
  errorCount: number;
}

/**
 * A number and what it was last period. `previous: null` means the comparison
 * could not be computed — a different fact from "the previous period was zero",
 * and the two must never render the same way.
 */
export interface MetricPair {
  current: number | null;
  previous: number | null;
}

export interface DashboardTotals {
  formImpressions: MetricPair;
  submissions: MetricPair;
  approved: MetricPair;
  rejected: MetricPair;
  flagged: MetricPair;
  /** Percent. `null` when there were no submissions to derive a rate from. */
  approvalRate: MetricPair;
  /** Percent. `null` when there were no submissions to derive a rate from. */
  conversionRate: MetricPair;
}

export interface FunnelStep {
  /** Contract key, used to pick the step's destination. */
  key: string;
  label: string;
  value: number;
}

export interface FunnelData {
  steps: FunnelStep[];
}

export interface PipelineData {
  pending: number;
  approved: number;
  rejected: number;
  flagged: number;
  /** Handled by auto-moderation without reaching a human. */
  autoResolved: number;
  /** Denominator for `autoResolved` — not the pipeline total. */
  totalWithAutoMod: number;
  medianApprovalHours: number | null;
}

export interface SourceEntry {
  source: string;
  label: string;
  count: number;
  /** Percent of this source's submissions that were approved. */
  approvalRate: number;
  oauthVerified: boolean;
}

export interface CountryEntry {
  countryCode: string;
  countryName: string;
  /** True for the API's catch-all bucket, so it can be marked rather than ranked as a place. */
  isUnknown: boolean;
  impressions: number;
}

export interface ContentPerformanceRow {
  id: string;
  authorName: string;
  authorCompany: string | null;
  content: string;
  impressions: number;
  rating: number | null;
  moderationStatus: string;
  createdAt: Date;
}

export interface RatingsData {
  /** rating 1–5 → count. Every bucket is present, including the zeroes. */
  distribution: Record<number, number>;
  /** `null` when nothing has been rated — an average of no ratings is not 0. */
  average: number | null;
  total: number;
}

export interface WidgetEngagementData {
  widgetId: string;
  widgetName: string;
  widgetType: string;
  layoutType: string;
  totalLoads: number;
  /** `null` when the widget has never loaded — 0 ms would read as perfect. */
  avgLoadMs: number | null;
  errorCount: number;
  impressions: number;
  lastLoadAt: Date | null;
}

export interface ApiKeyUsageData {
  keyId: string;
  keyName: string;
  keyPrefix: string;
  usageCount: number;
  /** `null` means no quota is configured, not "quota unknown". */
  usageLimit: number | null;
  rateLimit: number;
  lastUsedAt: Date | null;
  isActive: boolean;
  keyType: string;
}

export interface DeviceSplit {
  mobile: number;
  tablet: number;
  desktop: number;
  unknown: number;
}

export interface HeatmapCell {
  /** 0 = Sunday, matching `DAYS` in `submission-heatmap`. */
  day: number;
  hour: number;
  count: number;
}

export interface DashboardData {
  totals: DashboardTotals;
  /** False when the API returned no previous period, so no delta is offered. */
  hasComparison: boolean;
  timeseries: TimeseriesPoint[];
  prevTimeseries: TimeseriesPoint[];
  funnel: FunnelData;
  pipeline: PipelineData;
  topSources: SourceEntry[];
  topCountries: CountryEntry[];
  contentPerformance: ContentPerformanceRow[];
  ratings: RatingsData;
  widgetEngagement: WidgetEngagementData[];
  apiKeyUsage: ApiKeyUsageData[];
  deviceSplit: DeviceSplit;
  /** Percent of submissions with a verified identity. `null` with no submissions. */
  oauthVerifiedShare: number | null;
  submissionsByDayHour: HeatmapCell[];
}
