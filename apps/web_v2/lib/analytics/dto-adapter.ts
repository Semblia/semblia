import type { V2AnalyticsDashboardDTO } from "@workspace/types";
import type {
  DashboardData,
  TimeseriesPoint,
  KpiTile,
  FunnelData,
  SourceEntry,
  CountryEntry,
  WidgetEngagementData,
  ApiKeyUsageData,
  ContentPerformanceRow,
  RatingsData,
} from "./types";

const SOURCE_LABELS: Record<string, string> = {
  manual: "Direct form",
  google: "Google",
  twitter: "Twitter / X",
  github: "GitHub",
  linkedin: "LinkedIn",
  facebook: "Facebook",
};

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source.toLowerCase()] ?? source;
}

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  DE: "Germany",
  FR: "France",
  IN: "India",
  JP: "Japan",
  BR: "Brazil",
  AU: "Australia",
  NL: "Netherlands",
  ES: "Spain",
  SE: "Sweden",
  UNKNOWN: "Unknown",
};

function countryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code;
}

function mapDaily(daily: V2AnalyticsDashboardDTO["daily"]): TimeseriesPoint[] {
  return daily.map((d) => ({
    date: d.day,
    formImpressions: d.formViews,
    submissions: d.formSubmissions,
    approved: d.approved,
    rejected: d.rejected,
    flagged: d.flagged,
    published: d.published,
    widgetImpressions: d.testimonialImpressions,
    avgLoadMs: d.avgLoadMs,
    errorCount: d.errorCount,
  }));
}

function buildKpi(
  label: string,
  value: number,
  prevValue: number,
  series: number[],
  opts?: { isRate?: boolean; unit?: string },
): KpiTile {
  return {
    label,
    value,
    prevValue,
    isRate: opts?.isRate,
    unit: opts?.unit,
    series: series.slice(-14),
  };
}

export function dtoToDashboardData(
  dto: V2AnalyticsDashboardDTO,
): DashboardData {
  const timeseries = mapDaily(dto.daily);
  const prevTimeseries = dto.previous ? mapDaily(dto.previous.daily) : [];

  const totalSubmissions = dto.totals.formSubmissions;
  const totalApproved = dto.totals.approved;
  const prevSubmissions = dto.previous?.totals.formSubmissions ?? 0;
  const prevApproved = dto.previous?.totals.approved ?? 0;

  const approvalRate =
    totalSubmissions > 0 ? (totalApproved / totalSubmissions) * 100 : 0;
  const prevApprovalRate =
    prevSubmissions > 0 ? (prevApproved / prevSubmissions) * 100 : 0;

  const approvalRateSeries = timeseries.map((p) =>
    p.submissions > 0 ? (p.approved / p.submissions) * 100 : 0,
  );

  const kpis = {
    formImpressions: buildKpi(
      "Form impressions",
      dto.totals.formViews,
      dto.previous?.totals.formViews ?? 0,
      timeseries.map((p) => p.formImpressions),
    ),
    submissions: buildKpi(
      "Submissions",
      totalSubmissions,
      prevSubmissions,
      timeseries.map((p) => p.submissions),
    ),
    approvalRate: buildKpi(
      "Approval rate",
      parseFloat(approvalRate.toFixed(1)),
      parseFloat(prevApprovalRate.toFixed(1)),
      approvalRateSeries,
      { isRate: true },
    ),
    approved: buildKpi(
      "Approved",
      totalApproved,
      prevApproved,
      timeseries.map((p) => p.approved),
    ),
  };

  const funnel: FunnelData = {
    // "published" was retired from the product; the pipeline terminates at
    // "approved" (the publicly visible state). Drop any published funnel step.
    steps: dto.funnel.steps
      .filter((step) => step.key !== "published")
      .map((step) => ({
        label: step.label,
        value: step.value,
        href:
          step.key === "form_impressions"
            ? "?tab=collection"
            : step.key === "submitted"
              ? "responses"
              : "responses?status=approved",
      })),
  };

  const topSources: SourceEntry[] = dto.topSources.map((s) => ({
    source: s.source,
    label: sourceLabel(s.source),
    count: s.count,
    approvalRate: s.approvalRate,
    oauthVerified: s.oauthVerified,
  }));

  const topCountries: CountryEntry[] = dto.topCountries.map((c) => ({
    countryCode: c.countryCode,
    countryName: countryName(c.countryCode),
    impressions: c.impressions,
  }));

  const widgetEngagement: WidgetEngagementData[] = dto.widgetEngagement.map(
    (w) => ({
      widgetId: w.widgetId,
      widgetName: w.widgetName,
      widgetType: w.widgetType,
      layoutType: w.layoutType,
      totalLoads: w.totalLoads,
      avgLoadMs: w.avgLoadMs,
      errorCount: w.errorCount,
      impressions: w.impressions,
      lastLoadAt: w.lastLoadAt ? new Date(w.lastLoadAt) : null,
    }),
  );

  const apiKeyUsage: ApiKeyUsageData[] = dto.apiKeyUsage.map((k) => ({
    keyId: k.keyId,
    keyName: k.keyName,
    keyPrefix: k.keyPrefix,
    usageCount: k.usageCount,
    usageLimit: k.usageLimit,
    rateLimit: k.rateLimit,
    lastUsedAt: k.lastUsedAt ? new Date(k.lastUsedAt) : null,
    isActive: k.isActive,
    series: k.series,
    keyType: k.keyType,
  }));

  const contentPerformance: ContentPerformanceRow[] =
    dto.contentPerformance.map((row) => ({
      id: row.submissionId,
      authorName: row.authorName,
      authorCompany: row.authorCompany,
      content: row.content,
      impressions: row.impressions,
      rating: row.rating,
      moderationStatus: row.moderationStatus,
      createdAt: new Date(row.createdAt),
    }));

  const ratings: RatingsData = {
    distribution: dto.ratings.distribution.reduce<Record<number, number>>(
      (acc, { rating, count }) => {
        acc[rating] = count;
        return acc;
      },
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    ),
    average: dto.ratings.average,
    total: dto.ratings.total,
  };

  return {
    kpis,
    timeseries,
    prevTimeseries,
    funnel,
    pipeline: dto.pipeline,
    topSources,
    topCountries,
    contentPerformance,
    ratings,
    widgetEngagement,
    apiKeyUsage,
    deviceSplit: {
      mobile: dto.deviceSplit.mobile,
      tablet: dto.deviceSplit.tablet,
      desktop: dto.deviceSplit.desktop,
      unknown: dto.deviceSplit.unknown,
    },
    oauthVerifiedShare: dto.oauthVerifiedShare,
    submissionsByDayHour: dto.submissionsByDayHour,
  };
}
