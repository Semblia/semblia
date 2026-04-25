import type { TimeseriesPoint } from "./types";
import { MOCK_TESTIMONIALS, MOCK_WIDGETS, type MockTestimonial } from "@/lib/mock-data";

// ── Deterministic seeded pseudo-random (LCG) ─────────────────────────────────

function seededLcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) & 0xffffffff;
  }
  return h >>> 0;
}

// ── Smooth bell-ish distribution across days ─────────────────────────────────

function smoothDistribute(total: number, days: number, rand: () => number): number[] {
  if (days <= 0 || total <= 0) return Array(days).fill(0);

  // Generate a smooth base curve: sine wave + noise
  const base = Array.from({ length: days }, (_, i) => {
    const t = i / (days - 1);
    const sinePart = 0.5 + 0.3 * Math.sin(t * Math.PI * 2 - Math.PI / 2);
    const noise = 0.2 * rand();
    return Math.max(0, sinePart + noise);
  });

  const sum = base.reduce((a, b) => a + b, 0);
  // Scale to total, distributing as integer counts
  let remaining = total;
  const result = base.map((v, i) => {
    if (i === base.length - 1) return remaining;
    const share = Math.round((v / sum) * total);
    const clamped = Math.min(share, remaining);
    remaining -= clamped;
    return clamped;
  });
  return result;
}

// ── Generate per-project timeseries ──────────────────────────────────────────

export interface MockTimeseriesOptions {
  projectId: string;
  days: number;
  endDate?: Date;
}

export function getMockTimeseries({
  projectId,
  days,
  endDate,
}: MockTimeseriesOptions): TimeseriesPoint[] {
  const seed = hashString(projectId);
  const rand = seededLcg(seed);

  const testimonials: MockTestimonial[] = MOCK_TESTIMONIALS[projectId] ?? [];
  const widgets = MOCK_WIDGETS[projectId] ?? [];

  const totalSubmissions = testimonials.length + Math.round(rand() * 30 + 10);
  const totalApproved = testimonials.filter(
    (t) => t.moderationStatus === "APPROVED",
  ).length + Math.round(rand() * 5);
  const totalRejected = testimonials.filter(
    (t) => t.moderationStatus === "REJECTED",
  ).length;
  const totalFlagged = testimonials.filter(
    (t) => t.moderationStatus === "FLAGGED",
  ).length;
  const totalPublished = testimonials.filter((t) => t.isPublished).length;

  // Form impressions = submissions * (2.5 to 4.5x)
  const impressionMultiplier = 2.5 + rand() * 2;
  const totalFormImpressions = Math.round(totalSubmissions * impressionMultiplier);

  const totalWidgetImpressions = widgets.reduce(
    (sum, w) => sum + w._analytics.totalLoads,
    0,
  );
  const avgWidgetLoad =
    widgets.length > 0
      ? Math.round(
          widgets.reduce((sum, w) => sum + w._analytics.avgLoadMs, 0) /
            widgets.length,
        )
      : 350;

  // Distribute across days
  const submissionDist = smoothDistribute(totalSubmissions, days, rand);
  const approvedDist = smoothDistribute(totalApproved, days, rand);
  const rejectedDist = smoothDistribute(totalRejected, days, rand);
  const flaggedDist = smoothDistribute(totalFlagged, days, rand);
  const publishedDist = smoothDistribute(totalPublished, days, rand);
  const impressionDist = smoothDistribute(totalFormImpressions, days, rand);
  const widgetImprDist = smoothDistribute(totalWidgetImpressions, days, rand);

  const base = endDate ?? new Date();
  const points: TimeseriesPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(base);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    const idx = days - 1 - i;
    const loadVariance = 0.8 + rand() * 0.4; // 0.8 to 1.2x avg
    const errorRate = rand() < 0.15 ? Math.round(rand() * 3) : 0;

    points.push({
      date: dateStr,
      formImpressions: impressionDist[idx],
      submissions: submissionDist[idx],
      approved: approvedDist[idx],
      rejected: rejectedDist[idx],
      flagged: flaggedDist[idx],
      published: publishedDist[idx],
      widgetImpressions: widgetImprDist[idx],
      avgLoadMs: Math.round(avgWidgetLoad * loadVariance),
      errorCount: errorRate,
    });
  }

  return points;
}

// ── Day × hour heatmap ────────────────────────────────────────────────────────

export function getMockSubmissionHeatmap(
  projectId: string,
  totalSubmissions: number,
): { day: number; hour: number; count: number }[] {
  const seed = hashString(projectId + "_heatmap");
  const rand = seededLcg(seed);

  const cells: { day: number; hour: number; count: number }[] = [];
  // Weight toward business hours (9-18) and Mon-Fri
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const weekdayBias = day < 5 ? 1.4 : 0.6;
      const hourBias =
        hour >= 9 && hour <= 18
          ? 1.6
          : hour >= 19 && hour <= 22
            ? 1.1
            : 0.4;
      const raw = rand() * weekdayBias * hourBias;
      cells.push({ day, hour, count: raw });
    }
  }

  // Normalize to totalSubmissions
  const total = cells.reduce((s, c) => s + c.count, 0);
  return cells.map((c) => ({
    day: c.day,
    hour: c.hour,
    count: Math.round((c.count / total) * totalSubmissions),
  }));
}

// ── Country distribution ──────────────────────────────────────────────────────

const COUNTRY_POOL: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "IN", name: "India" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "SG", name: "Singapore" },
  { code: "BR", name: "Brazil" },
];

export function getMockCountryData(
  projectId: string,
  totalImpressions: number,
): { countryCode: string; countryName: string; impressions: number }[] {
  const seed = hashString(projectId + "_country");
  const rand = seededLcg(seed);

  const weights = COUNTRY_POOL.map(() => rand() * rand()); // concentrate in top countries
  const total = weights.reduce((a, b) => a + b, 0);
  let remaining = totalImpressions;

  return COUNTRY_POOL.map((c, i) => {
    const share = i === COUNTRY_POOL.length - 1
      ? remaining
      : Math.round((weights[i] / total) * totalImpressions);
    const clamped = Math.min(share, remaining);
    remaining -= clamped;
    return {
      countryCode: c.code,
      countryName: c.name,
      impressions: clamped,
    };
  })
    .filter((c) => c.impressions > 0)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 8);
}

// ── Device split ──────────────────────────────────────────────────────────────

export function getMockDeviceSplit(
  projectId: string,
): { mobile: number; tablet: number; desktop: number } {
  const seed = hashString(projectId + "_device");
  const rand = seededLcg(seed);

  const mobile = 35 + Math.round(rand() * 25); // 35–60%
  const tablet = 8 + Math.round(rand() * 10); // 8–18%
  const desktop = 100 - mobile - tablet;
  return { mobile, tablet, desktop: Math.max(desktop, 20) };
}

// ── Alert data ────────────────────────────────────────────────────────────────

export function getMockAlerts(
  projectId: string,
): {
  id: string;
  widgetId: string;
  widgetName: string;
  alertType: "LOAD_TIME_EXCEEDED" | "ERROR_RATE_EXCEEDED";
  severity: "LOW" | "MEDIUM" | "HIGH";
  actualValue: number;
  threshold: number;
  resolved: boolean;
  timestamp: Date;
}[] {
  const widgets = MOCK_WIDGETS[projectId] ?? [];
  if (widgets.length === 0) return [];

  const seed = hashString(projectId + "_alerts");
  const rand = seededLcg(seed);

  const alerts = [];
  for (const widget of widgets) {
    if (rand() > 0.6) {
      alerts.push({
        id: `alert_${widget.id}_lt`,
        widgetId: widget.id,
        widgetName: widget.name,
        alertType: "LOAD_TIME_EXCEEDED" as const,
        severity: (widget._analytics.avgLoadMs > 400 ? "HIGH" : "MEDIUM") as "HIGH" | "MEDIUM" | "LOW",
        actualValue: widget._analytics.avgLoadMs,
        threshold: 350,
        resolved: rand() > 0.5,
        timestamp: new Date(Date.now() - Math.round(rand() * 7 * 24 * 60 * 60 * 1000)),
      });
    }
    if (rand() > 0.75) {
      alerts.push({
        id: `alert_${widget.id}_er`,
        widgetId: widget.id,
        widgetName: widget.name,
        alertType: "ERROR_RATE_EXCEEDED" as const,
        severity: "LOW" as const,
        actualValue: Math.round(rand() * 5 + 1),
        threshold: 3,
        resolved: rand() > 0.3,
        timestamp: new Date(Date.now() - Math.round(rand() * 14 * 24 * 60 * 60 * 1000)),
      });
    }
  }

  return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// ── Testimonial impression data ───────────────────────────────────────────────

export function getMockTestimonialImpressions(
  projectId: string,
): Record<string, number> {
  const testimonials = MOCK_TESTIMONIALS[projectId] ?? [];
  if (testimonials.length === 0) return {};

  const seed = hashString(projectId + "_timpr");
  const rand = seededLcg(seed);

  return Object.fromEntries(
    testimonials.map((t) => [
      t.id,
      t.isPublished ? Math.round(100 + rand() * 2000) : 0,
    ]),
  );
}
