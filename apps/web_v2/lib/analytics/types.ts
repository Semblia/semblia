export type AnalyticsRange =
  | "7d"
  | "30d"
  | "90d"
  | "mtd"
  | "qtd"
  | "ytd"
  | "custom";

export type AnalyticsCompare = "prev" | "none";

export type AnalyticsMetric =
  | "submissions"
  | "approvals"
  | "impressions"
  | "loadtime";

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

export interface TimeseriesPoint {
  date: string; // YYYY-MM-DD
  formImpressions: number;
  submissions: number;
  approved: number;
  rejected: number;
  flagged: number;
  published: number;
  widgetImpressions: number;
  avgLoadMs: number;
  errorCount: number;
}

export interface KpiTile {
  label: string;
  value: number;
  prevValue: number;
  unit?: string;
  isRate?: boolean; // display as %
  series: number[]; // sparkline series
}

export interface FunnelStep {
  label: string;
  value: number;
  href: string;
}

export interface FunnelData {
  steps: FunnelStep[];
}

export interface PipelineData {
  pending: number;
  approved: number;
  rejected: number;
  flagged: number;
  autoResolved: number; // auto-mod handled, no manual review
  totalWithAutoMod: number;
  medianApprovalHours: number | null;
}

export interface SourceEntry {
  source: string;
  label: string;
  count: number;
  approvalRate: number;
  oauthVerified: boolean;
}

export interface CountryEntry {
  countryCode: string;
  countryName: string;
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
  distribution: Record<number, number>; // rating 1-5 => count
  average: number;
  total: number;
}

export interface WidgetEngagementData {
  widgetId: string;
  widgetName: string;
  widgetType: string;
  layoutType: string;
  totalLoads: number;
  avgLoadMs: number;
  errorCount: number;
  impressions: number;
  lastLoadAt: Date | null;
}

export interface ApiKeyUsageData {
  keyId: string;
  keyName: string;
  keyPrefix: string;
  usageCount: number;
  usageLimit: number | null;
  rateLimit: number;
  lastUsedAt: Date | null;
  isActive: boolean;
  series: number[]; // daily usage series for sparkline
  keyType: string;
}

export interface DeviceSplit {
  mobile: number;
  tablet: number;
  desktop: number;
  unknown: number;
}

export interface DashboardData {
  kpis: {
    formImpressions: KpiTile;
    submissions: KpiTile;
    approvalRate: KpiTile;
    approved: KpiTile;
  };
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
  oauthVerifiedShare: number; // % of submissions that are OAuth verified
  submissionsByDayHour: { day: number; hour: number; count: number }[];
}
