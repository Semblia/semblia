"use client";

import { useMemo, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChartLine,
  Funnel,
  CheckSquare,
  Gauge,
  Globe,
  Code,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { RangePicker } from "./range-picker";
import { StatTile } from "./stat-tile";
import { HeroChart } from "./hero-chart";
import { FunnelCard } from "./funnel-card";
import { PipelineCard } from "./pipeline-card";
import { PublishRateCard } from "./publish-rate-card";
import { TopSourcesList } from "./top-sources-list";
import { RatingsDistribution } from "./ratings-distribution";
import { WidgetEngagementGrid } from "./widget-engagement-grid";
import { TopCountriesBar } from "./top-countries-bar";
import { ContentPerformanceTable } from "./content-performance-table";
import { ApiUsageCard } from "./api-usage-card";
import { AlertsRail } from "./alerts-rail";
import { SubmissionHeatmap } from "./submission-heatmap";
import { DeviceSplitCard } from "./device-split-card";
import { buildDashboardData } from "@/lib/analytics/aggregate";
import { resolveRange } from "@/lib/analytics/range";
import {
  getProjectBySlug,
  getTestimonialsByProject,
  getWidgetsByProject,
  getApiKeysByProject,
} from "@/lib/mock-data";
import type {
  AnalyticsRange,
  AnalyticsTab,
  AnalyticsMetric,
  AnalyticsCompare,
} from "@/lib/analytics/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeader,
  PageBody,
  FilterPills,
  type FilterPillOption,
} from "@/components/shared";

// ── Tab config ─────────────────────────────────────────────────────────────────

interface TabConfig {
  id: AnalyticsTab;
  label: string;
  Icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { id: "overview", label: "Overview", Icon: ChartLine },
  { id: "collection", label: "Collection", Icon: Funnel },
  { id: "pipeline", label: "Pipeline", Icon: CheckSquare },
  { id: "engagement", label: "Engagement", Icon: Gauge },
  { id: "sources", label: "Sources", Icon: Globe },
  { id: "api", label: "API", Icon: Code },
];

// ── URL state helpers ──────────────────────────────────────────────────────────

function useAnalyticsState() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = (searchParams.get("tab") ?? "overview") as AnalyticsTab;
  const range = (searchParams.get("range") ?? "30d") as AnalyticsRange;
  const compare = (searchParams.get("compare") ?? "prev") as AnalyticsCompare;
  const metric = (searchParams.get("metric") ??
    "submissions") as AnalyticsMetric;
  const customFrom = searchParams.get("from") ?? undefined;
  const customTo = searchParams.get("to") ?? undefined;

  const push = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === null) {
          params.delete(k);
        } else {
          params.set(k, v);
        }
      }
      // Remove defaults to keep URLs clean
      if (params.get("tab") === "overview") params.delete("tab");
      if (params.get("range") === "30d") params.delete("range");
      if (params.get("compare") === "prev") params.delete("compare");
      if (params.get("metric") === "submissions") params.delete("metric");
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  return { tab, range, compare, metric, customFrom, customTo, push };
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

interface AnalyticsDashboardProps {
  projectSlug: string;
}

export function AnalyticsDashboard({ projectSlug }: AnalyticsDashboardProps) {
  const [isPending, startTransition] = useTransition();
  const { tab, range, compare, metric, customFrom, customTo, push } =
    useAnalyticsState();

  const dateRange = useMemo(
    () => resolveRange(range, customFrom, customTo),
    [range, customFrom, customTo],
  );

  const data = useMemo(() => {
    const project = getProjectBySlug(projectSlug);
    if (!project) return null;
    const testimonials = getTestimonialsByProject(project.id);
    const widgets = getWidgetsByProject(project.id);
    const apiKeys = getApiKeysByProject(project.id);
    return {
      project,
      ...buildDashboardData(project, testimonials, widgets, apiKeys, dateRange),
    };
  }, [projectSlug, dateRange]);

  function setTab(t: AnalyticsTab) {
    startTransition(() => push({ tab: t }));
  }

  function setRange(r: AnalyticsRange, from?: string, to?: string) {
    startTransition(() =>
      push({
        range: r,
        ...(from ? { from } : { from: undefined }),
        ...(to ? { to } : { to: undefined }),
      }),
    );
  }

  function toggleCompare() {
    startTransition(() =>
      push({ compare: compare === "prev" ? "none" : "prev" }),
    );
  }

  if (!data) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="border-b border-border px-6 pt-7 pb-5 space-y-4">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="px-6 py-8 space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-52 rounded-lg" />
        </div>
      </div>
    );
  }

  const showComparison = compare === "prev";

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Analytics"
        description={data.project.name}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleCompare}
              className={cn(
                "h-8 gap-1.5 px-3 text-xs border-border/60",
                "transition-all duration-150 active:scale-[0.97]",
                showComparison
                  ? "bg-brand/10 border-brand/40 text-foreground font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "bg-card text-muted-foreground font-medium hover:text-foreground",
              )}
              aria-pressed={showComparison}
            >
              <ArrowsClockwise
                weight={showComparison ? "fill" : "regular"}
                className={cn("size-3.5", showComparison ? "text-brand" : "")}
              />
              Compare
            </Button>
            <RangePicker
              value={range}
              customFrom={customFrom}
              customTo={customTo}
              onChange={setRange}
            />
          </>
        }
        toolbar={
          <FilterPills<AnalyticsTab>
            className="-my-2.5 flex-1"
            variant="tabs"
            aria-label="Analytics sections"
            options={TABS.map(
              ({ id, label, Icon }): FilterPillOption<AnalyticsTab> => ({
                id,
                label,
                icon: Icon as FilterPillOption<AnalyticsTab>["icon"],
              }),
            )}
            value={tab}
            onChange={setTab}
          />
        }
      />

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <PageBody
        padding="compact"
        stack
        className={cn(
          "transition-opacity duration-200",
          isPending && "opacity-60 pointer-events-none",
        )}
      >
        {/* ── KPI strip — always visible ─────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            tile={data.kpis.formImpressions}
            showComparison={showComparison}
          />
          <StatTile
            tile={data.kpis.submissions}
            showComparison={showComparison}
          />
          <StatTile
            tile={data.kpis.approvalRate}
            showComparison={showComparison}
          />
          <StatTile
            tile={data.kpis.published}
            showComparison={showComparison}
          />
        </div>

        {/* ── Tab bodies ─────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <OverviewTab
            data={data}
            projectSlug={projectSlug}
            metric={metric}
            showComparison={showComparison}
            onMetricChange={(m) => push({ metric: m })}
          />
        )}
        {tab === "collection" && (
          <CollectionTab
            data={data}
            projectSlug={projectSlug}
            metric="impressions"
            showComparison={showComparison}
          />
        )}
        {tab === "pipeline" && (
          <PipelineTab
            data={data}
            projectSlug={projectSlug}
            showComparison={showComparison}
          />
        )}
        {tab === "engagement" && (
          <EngagementTab
            data={data}
            projectSlug={projectSlug}
            showComparison={showComparison}
          />
        )}
        {tab === "sources" && (
          <SourcesTab data={data} projectSlug={projectSlug} />
        )}
        {tab === "api" && <ApiTab data={data} projectSlug={projectSlug} />}
      </PageBody>
    </div>
  );
}

// ── Tab components ─────────────────────────────────────────────────────────────

interface TabProps {
  data: ReturnType<typeof buildDashboardData>;
  projectSlug: string;
  showComparison?: boolean;
}

function OverviewTab({
  data,
  projectSlug,
  metric,
  showComparison,
  onMetricChange,
}: TabProps & {
  metric: AnalyticsMetric;
  onMetricChange: (m: AnalyticsMetric) => void;
}) {
  const metricOptions: { id: AnalyticsMetric; label: string }[] = [
    { id: "submissions", label: "Submissions" },
    { id: "approvals", label: "Approvals" },
    { id: "impressions", label: "Impressions" },
  ];

  return (
    <div className="space-y-4">
      {/* Hero chart with metric selector */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-sm font-semibold text-foreground">Trends</h3>
          <div className="flex items-center gap-1">
            {metricOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onMetricChange(opt.id)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium transition-all duration-150",
                  metric === opt.id
                    ? "bg-brand/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <HeroChart
          series={data.timeseries}
          prevSeries={data.prevTimeseries}
          metric={metric}
          showComparison={!!showComparison}
        />
      </div>

      {/* Funnel */}
      <FunnelCard data={data.funnel} projectSlug={projectSlug} />

      {/* Pipeline + Publish rate */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PipelineCard data={data.pipeline} projectSlug={projectSlug} />
        <PublishRateCard data={data.publishRate} />
      </div>

      {/* Widget engagement compact */}
      <WidgetEngagementGrid
        widgets={data.widgetEngagement}
        projectSlug={projectSlug}
        compact
      />
    </div>
  );
}

function CollectionTab({
  data,
  projectSlug,
  showComparison,
}: TabProps & { metric: string }) {
  return (
    <div className="space-y-4">
      {/* Hero chart */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Form impressions vs submissions
        </h3>
        <HeroChart
          series={data.timeseries}
          prevSeries={data.prevTimeseries}
          metric="impressions"
          showComparison={!!showComparison}
        />
      </div>

      {/* Funnel expanded */}
      <FunnelCard data={data.funnel} projectSlug={projectSlug} />

      {/* Sources + Heatmap */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TopSourcesList
          sources={data.topSources}
          projectSlug={projectSlug}
          compact
        />
        <RatingsDistribution data={data.ratings} />
      </div>

      <SubmissionHeatmap data={data.submissionsByDayHour} />
    </div>
  );
}

function PipelineTab({ data, projectSlug, showComparison }: TabProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Moderation over time
        </h3>
        <HeroChart
          series={data.timeseries}
          prevSeries={data.prevTimeseries}
          metric="approvals"
          showComparison={!!showComparison}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PipelineCard data={data.pipeline} projectSlug={projectSlug} />
        <PublishRateCard data={data.publishRate} />
      </div>

      <ContentPerformanceTable
        rows={data.contentPerformance}
        projectSlug={projectSlug}
        compact
      />
    </div>
  );
}

function EngagementTab({ data, projectSlug, showComparison }: TabProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Widget impressions over time
        </h3>
        <HeroChart
          series={data.timeseries}
          prevSeries={data.prevTimeseries}
          metric="impressions"
          showComparison={!!showComparison}
        />
      </div>

      <WidgetEngagementGrid
        widgets={data.widgetEngagement}
        projectSlug={projectSlug}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TopCountriesBar countries={data.topCountries} />
        <DeviceSplitCard data={data.deviceSplit} />
      </div>

      <ContentPerformanceTable
        rows={data.contentPerformance}
        projectSlug={projectSlug}
        compact
      />

      <AlertsRail alerts={data.alerts} projectSlug={projectSlug} />
    </div>
  );
}

function SourcesTab({ data, projectSlug }: TabProps) {
  return (
    <div className="space-y-4">
      <TopSourcesList sources={data.topSources} projectSlug={projectSlug} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RatingsDistribution data={data.ratings} />
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              OAuth verified
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Share with verified identity
            </p>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-semibold tabular-nums font-mono text-foreground">
              {Math.round(data.oauthVerifiedShare)}%
            </span>
            <span className="text-xs text-muted-foreground mb-1.5">
              of submissions
            </span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-success/70 transition-all duration-500"
              style={{ width: `${Math.round(data.oauthVerifiedShare)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            OAuth-verified testimonials typically have higher approval rates and
            stronger social proof.
          </p>
        </div>
      </div>

      <ContentPerformanceTable
        rows={data.contentPerformance}
        projectSlug={projectSlug}
      />
    </div>
  );
}

function ApiTab({ data, projectSlug }: TabProps) {
  return (
    <div className="space-y-4">
      <ApiUsageCard keys={data.apiKeyUsage} />
      <AlertsRail alerts={data.alerts} projectSlug={projectSlug} />
    </div>
  );
}
