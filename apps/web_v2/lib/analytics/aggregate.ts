import type {
  DashboardData,
  KpiTile,
  FunnelData,
  PipelineData,
  PublishRateData,
  SourceEntry,
  ContentPerformanceRow,
  RatingsData,
  WidgetEngagementData,
  ApiKeyUsageData,
} from "./types";
import { getRangeDays, getPreviousPeriod } from "./range";
import {
  getMockTimeseries,
  getMockSubmissionHeatmap,
  getMockCountryData,
  getMockDeviceSplit,
  getMockAlerts,
  getMockTestimonialImpressions,
} from "./mock-timeseries";
import type { MockProject, MockTestimonial, MockWidget, MockApiKey } from "@/lib/mock-data";
import type { DateRange } from "./types";

// ── Sum helpers ───────────────────────────────────────────────────────────────

function sum(series: number[]): number {
  return series.reduce((a, b) => a + b, 0);
}

function avg(series: number[]): number {
  if (series.length === 0) return 0;
  return sum(series) / series.length;
}

function buildKpi(
  label: string,
  series: number[],
  prevSeries: number[],
  opts?: { unit?: string; isRate?: boolean },
): KpiTile {
  const value = opts?.isRate
    ? series.length > 0 ? parseFloat((avg(series)).toFixed(1)) : 0
    : sum(series);
  const prevValue = opts?.isRate
    ? prevSeries.length > 0 ? parseFloat((avg(prevSeries)).toFixed(1)) : 0
    : sum(prevSeries);

  return {
    label,
    value,
    prevValue,
    unit: opts?.unit,
    isRate: opts?.isRate,
    series: series.slice(-14), // last 14 points for sparkline
  };
}

// ── Source labels ─────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  manual: "Direct form",
  google: "Google",
  twitter: "Twitter / X",
  github: "GitHub",
  linkedin: "LinkedIn",
  facebook: "Facebook",
};

function sourceLabel(source: string | null): string {
  if (!source) return "Unknown";
  return SOURCE_LABELS[source.toLowerCase()] ?? source;
}

// ── Main aggregation ──────────────────────────────────────────────────────────

export function buildDashboardData(
  project: MockProject,
  testimonials: MockTestimonial[],
  widgets: MockWidget[],
  apiKeys: MockApiKey[],
  dateRange: DateRange,
): DashboardData {
  const days = Math.max(getRangeDays(dateRange), 1);
  const prevRange = getPreviousPeriod(dateRange);
  const prevDays = Math.max(getRangeDays(prevRange), 1);

  const series = getMockTimeseries({ projectId: project.id, days });
  const prevSeries = getMockTimeseries({ projectId: project.id, days: prevDays });

  // ── KPIs ───────────────────────────────────────────────────────────────────

  const approvalRateSeries = series.map((p) =>
    p.submissions > 0 ? (p.approved / p.submissions) * 100 : 0,
  );
  const prevApprovalRateSeries = prevSeries.map((p) =>
    p.submissions > 0 ? (p.approved / p.submissions) * 100 : 0,
  );

  const kpis = {
    formImpressions: buildKpi(
      "Form impressions",
      series.map((p) => p.formImpressions),
      prevSeries.map((p) => p.formImpressions),
    ),
    submissions: buildKpi(
      "Submissions",
      series.map((p) => p.submissions),
      prevSeries.map((p) => p.submissions),
    ),
    approvalRate: buildKpi(
      "Approval rate",
      approvalRateSeries,
      prevApprovalRateSeries,
      { isRate: true },
    ),
    published: buildKpi(
      "Published",
      series.map((p) => p.published),
      prevSeries.map((p) => p.published),
    ),
  };

  // ── Funnel ─────────────────────────────────────────────────────────────────

  const totalImpressions = sum(series.map((p) => p.formImpressions));
  const totalSubmissions = sum(series.map((p) => p.submissions));
  const totalApproved = testimonials.filter(
    (t) => t.moderationStatus === "APPROVED",
  ).length;
  const totalPublished = testimonials.filter((t) => t.isPublished).length;

  const funnel: FunnelData = {
    steps: [
      {
        label: "Form impressions",
        value: totalImpressions,
        href: "?tab=collection",
      },
      {
        label: "Submitted",
        value: totalSubmissions,
        href: "testimonials",
      },
      {
        label: "Approved",
        value: totalApproved,
        href: "testimonials?status=approved",
      },
      {
        label: "Published",
        value: totalPublished,
        href: "testimonials?status=published",
      },
    ],
  };

  // ── Pipeline ───────────────────────────────────────────────────────────────

  const pending = testimonials.filter((t) => t.moderationStatus === "PENDING").length;
  const approved = testimonials.filter((t) => t.moderationStatus === "APPROVED").length;
  const rejected = testimonials.filter((t) => t.moderationStatus === "REJECTED").length;
  const flagged = testimonials.filter((t) => t.moderationStatus === "FLAGGED").length;
  const autoResolved = testimonials.filter(
    (t) => t.autoPublished || (t.moderationScore !== null && t.moderationScore < 0.1 && t.moderationStatus === "APPROVED"),
  ).length;

  const approvedWithTimes = testimonials
    .filter((t) => t.moderationStatus === "APPROVED")
    .map((t) => (t.updatedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60));
  const medianApprovalHours =
    approvedWithTimes.length > 0
      ? approvedWithTimes.sort((a, b) => a - b)[Math.floor(approvedWithTimes.length / 2)]
      : null;

  const pipeline: PipelineData = {
    pending,
    approved,
    rejected,
    flagged,
    autoResolved,
    totalWithAutoMod: testimonials.length,
    medianApprovalHours,
  };

  // ── Publish rate ───────────────────────────────────────────────────────────

  const publishRate: PublishRateData = {
    publishRate: approved > 0 ? (totalPublished / approved) * 100 : 0,
    autoPublishedShare:
      totalPublished > 0
        ? (testimonials.filter((t) => t.autoPublished && t.isPublished).length /
            totalPublished) *
          100
        : 0,
    totalPublished,
    totalApproved: approved,
  };

  // ── Sources ────────────────────────────────────────────────────────────────

  const sourceMap = new Map<string, MockTestimonial[]>();
  for (const t of testimonials) {
    const key = t.oauthProvider ?? t.source ?? "manual";
    const arr = sourceMap.get(key) ?? [];
    arr.push(t);
    sourceMap.set(key, arr);
  }

  const topSources: SourceEntry[] = Array.from(sourceMap.entries())
    .map(([source, items]) => {
      const approvedCount = items.filter((t) => t.moderationStatus === "APPROVED").length;
      return {
        source,
        label: sourceLabel(source),
        count: items.length,
        approvalRate: items.length > 0 ? (approvedCount / items.length) * 100 : 0,
        oauthVerified: items.some((t) => t.isOAuthVerified),
      };
    })
    .sort((a, b) => b.count - a.count);

  // ── Ratings ────────────────────────────────────────────────────────────────

  const ratedTestimonials = testimonials.filter((t) => t.rating !== null);
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const t of ratedTestimonials) {
    if (t.rating !== null) {
      distribution[Math.round(t.rating)] =
        (distribution[Math.round(t.rating)] ?? 0) + 1;
    }
  }
  const ratingAvg =
    ratedTestimonials.length > 0
      ? ratedTestimonials.reduce((s, t) => s + (t.rating ?? 0), 0) /
        ratedTestimonials.length
      : 0;

  const ratings: RatingsData = {
    distribution,
    average: parseFloat(ratingAvg.toFixed(1)),
    total: ratedTestimonials.length,
  };

  // ── Content performance ────────────────────────────────────────────────────

  const impressionMap = getMockTestimonialImpressions(project.id);

  const contentPerformance: ContentPerformanceRow[] = testimonials
    .map((t) => ({
      id: t.id,
      authorName: t.authorName,
      authorCompany: t.authorCompany,
      content: t.content,
      impressions: impressionMap[t.id] ?? 0,
      rating: t.rating,
      moderationStatus: t.moderationStatus,
      isPublished: t.isPublished,
      createdAt: t.createdAt,
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  // ── Widget engagement ──────────────────────────────────────────────────────

  const widgetImpressionBySeries = new Map<string, number>();
  for (const w of widgets) {
    widgetImpressionBySeries.set(w.id, w._analytics.totalLoads);
  }

  const widgetEngagement: WidgetEngagementData[] = widgets.map((w) => ({
    widgetId: w.id,
    widgetName: w.name,
    widgetType: w.widgetType,
    layoutType: w.layoutType,
    totalLoads: w._analytics.totalLoads,
    avgLoadMs: w._analytics.avgLoadMs,
    errorCount: w._analytics.avgLoadMs > 400 ? Math.round(w._analytics.totalLoads * 0.02) : 0,
    impressions: widgetImpressionBySeries.get(w.id) ?? 0,
    lastLoadAt: w._analytics.lastLoadAt,
  }));

  // ── API usage ──────────────────────────────────────────────────────────────

  const apiKeyUsage: ApiKeyUsageData[] = apiKeys.map((key) => {
    // Build a fake daily usage sparkline from total usage
    const dailySeed = key.usageCount;
    const dailyTotal = Math.round(key.usageCount / 30);
    const sparkSeries = Array.from({ length: 14 }, (_, i) => {
      const noise = Math.sin(i * 0.7 + dailySeed * 0.001) * 0.3 + 0.7;
      return Math.max(0, Math.round(dailyTotal * noise));
    });

    return {
      keyId: key.id,
      keyName: key.name,
      keyPrefix: key.keyPrefix,
      usageCount: key.usageCount,
      usageLimit: key.usageLimit,
      rateLimit: key.rateLimit,
      lastUsedAt: key.lastUsedAt,
      isActive: key.isActive,
      series: sparkSeries,
      permissions: key.permissions,
    };
  });

  // ── Derived extras ─────────────────────────────────────────────────────────

  const oauthVerifiedShare =
    testimonials.length > 0
      ? (testimonials.filter((t) => t.isOAuthVerified).length /
          testimonials.length) *
        100
      : 0;

  const submissionsByDayHour = getMockSubmissionHeatmap(project.id, totalSubmissions);
  const topCountries = getMockCountryData(
    project.id,
    sum(series.map((p) => p.widgetImpressions)),
  );
  const deviceSplit = getMockDeviceSplit(project.id);
  const alerts = getMockAlerts(project.id);

  return {
    kpis,
    timeseries: series,
    prevTimeseries: prevSeries,
    funnel,
    pipeline,
    publishRate,
    topSources,
    topCountries,
    contentPerformance,
    ratings,
    widgetEngagement,
    apiKeyUsage,
    alerts,
    deviceSplit,
    oauthVerifiedShare,
    submissionsByDayHour,
  };
}
