import type { V2AnalyticsDashboardDTO } from "@workspace/types";
import { humanizeLabel } from "@/lib/format";
import type {
  ApiKeyUsageData,
  ContentPerformanceRow,
  CountryEntry,
  DashboardData,
  DashboardTotals,
  FunnelData,
  MetricPair,
  RatingsData,
  SourceEntry,
  TimeseriesPoint,
  WidgetEngagementData,
} from "./types";

/**
 * V2 analytics DTO → the shapes the dashboard renders.
 *
 * The adapter is where "we don't have this" has to survive. The previous one
 * coerced every missing previous-period total with `?? 0`, so a project with no
 * comparison available, a project whose previous period genuinely was zero, and
 * a project the API failed to aggregate all arrived here as `0` — and the tiles
 * then hid the delta for all three. Absence is preserved as `null` from here
 * down, and the components decide how to say it.
 *
 * It also stopped slicing every sparkline to the last 14 points: that graphic
 * described a different period from the number above it on any range longer
 * than a fortnight, and it is gone along with the sparkline itself.
 */

const SOURCE_LABELS: Record<string, string> = {
  manual: "Direct form",
  google: "Google",
  twitter: "Twitter / X",
  github: "GitHub",
  linkedin: "LinkedIn",
  facebook: "Facebook",
};

function sourceLabel(source: string): string {
  const known = SOURCE_LABELS[source.toLowerCase()];
  // An unrecognised source is humanised rather than shown raw — the API can
  // grow a provider before this map does, and `product_hunt` is not a label.
  return known ?? (humanizeLabel(source) || source);
}

// ── Country naming ───────────────────────────────────────────────────────────
//
// `Intl.DisplayNames` is a platform feature and knows every region, replacing a
// hand-kept table of 13 codes that rendered real traffic from Italy or Poland
// as "IT" and "PL" beside "United States".

const UNKNOWN_COUNTRY = "UNKNOWN";
const REGION_CODE = /^[A-Za-z]{2}$/;

let regionNames: Intl.DisplayNames | null | undefined;

function regionDisplayNames(): Intl.DisplayNames | null {
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      regionNames = null;
    }
  }
  return regionNames;
}

function countryName(code: string): string {
  if (!REGION_CODE.test(code)) return "Unknown";
  const upper = code.toUpperCase();
  try {
    return regionDisplayNames()?.of(upper) ?? upper;
  } catch {
    return upper;
  }
}

// ── Series ───────────────────────────────────────────────────────────────────

function mapDaily(daily: V2AnalyticsDashboardDTO["daily"]): TimeseriesPoint[] {
  return daily.map((d) => ({
    date: d.day,
    formImpressions: d.formViews,
    submissions: d.formSubmissions,
    approved: d.approved,
    rejected: d.rejected,
    flagged: d.flagged,
    widgetImpressions: d.testimonialImpressions,
    avgLoadMs: d.avgLoadMs,
    errorCount: d.errorCount,
  }));
}

/** A count and its previous-period counterpart, with absence preserved. */
function pair(current: number, previous: number | null): MetricPair {
  return { current, previous };
}

/** A rate needs a denominator; without one there is no rate, not a zero. */
function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return (numerator / denominator) * 100;
}

export function dtoToDashboardData(
  dto: V2AnalyticsDashboardDTO,
): DashboardData {
  const timeseries = mapDaily(dto.daily);
  const prevTimeseries = dto.previous ? mapDaily(dto.previous.daily) : [];
  const prev = dto.previous?.totals ?? null;

  const totals: DashboardTotals = {
    formImpressions: pair(dto.totals.formViews, prev?.formViews ?? null),
    submissions: pair(
      dto.totals.formSubmissions,
      prev?.formSubmissions ?? null,
    ),
    approved: pair(dto.totals.approved, prev?.approved ?? null),
    rejected: pair(dto.totals.rejected, prev?.rejected ?? null),
    flagged: pair(dto.totals.flagged, prev?.flagged ?? null),
    // Approvals divided by submissions rendered "133.3%" on a real project:
    // the two are independent window aggregates, so clearing a backlog
    // approves responses that were submitted before the window opened. The
    // honest denominator is the decisions actually taken in the window, which
    // is what an approval rate means and cannot exceed 100%.
    approvalRate: {
      current: rate(
        dto.totals.approved,
        dto.totals.approved + dto.totals.rejected,
      ),
      previous: prev
        ? rate(prev.approved, prev.approved + prev.rejected)
        : null,
    },
    conversionRate: {
      current: rate(dto.totals.formSubmissions, dto.totals.formViews),
      previous: prev ? rate(prev.formSubmissions, prev.formViews) : null,
    },
  };

  // Destinations are the component's business — it knows the project slug and
  // which filters the Responses inbox actually honours. The adapter carries the
  // contract key so that mapping stays in one readable place.
  const funnel: FunnelData = {
    steps: dto.funnel.steps.map((step) => ({
      key: step.key,
      label: step.label,
      value: step.value,
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
    isUnknown:
      c.countryCode === UNKNOWN_COUNTRY || !REGION_CODE.test(c.countryCode),
    impressions: c.impressions,
  }));

  const widgetEngagement: WidgetEngagementData[] = dto.widgetEngagement.map(
    (w) => ({
      widgetId: w.widgetId,
      widgetName: w.widgetName,
      widgetType: w.widgetType,
      layoutType: w.layoutType,
      totalLoads: w.totalLoads,
      // A widget that never loaded has no average load time. Reporting the
      // API's `0` would read as flawless performance.
      avgLoadMs: w.totalLoads > 0 ? w.avgLoadMs : null,
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
    average: dto.ratings.total > 0 ? dto.ratings.average : null,
    total: dto.ratings.total,
  };

  return {
    totals,
    hasComparison: dto.previous !== null,
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
    // A share of nothing is not 0%: with no submissions there is no share.
    oauthVerifiedShare:
      dto.totals.formSubmissions > 0 ? dto.oauthVerifiedShare : null,
    submissionsByDayHour: dto.submissionsByDayHour,
  };
}
