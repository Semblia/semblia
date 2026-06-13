"use client";

import { useMemo, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChartLineIcon,
  FunnelIcon,
  CheckSquareIcon,
  GaugeIcon,
  GlobeIcon,
  CodeIcon,
  ArrowsClockwiseIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { RangePicker } from "./range-picker";
import { StatTile } from "./stat-tile";
import { HeroChart } from "./hero-chart";
import { FunnelCard } from "./funnel-card";
import { PipelineCard } from "./pipeline-card";
import { TopSourcesList } from "./top-sources-list";
import { RatingsDistribution } from "./ratings-distribution";
import { WidgetEngagementGrid } from "./widget-engagement-grid";
import { TopCountriesBar } from "./top-countries-bar";
import { ContentPerformanceTable } from "./content-performance-table";
import { ApiUsageCard } from "./api-usage-card";
import { SubmissionHeatmap } from "./submission-heatmap";
import { DeviceSplitCard } from "./device-split-card";
import { dtoToDashboardData } from "@/lib/analytics/dto-adapter";
import { resolveRange, getRangeDays } from "@/lib/analytics/range";
import type {
  AnalyticsRange,
  AnalyticsTab,
  AnalyticsMetric,
  AnalyticsCompare,
  DashboardData,
} from "@/lib/analytics/types";
import { useAnalyticsDashboard, useProject } from "@/hooks/api";
import { useLiveQueryState } from "@/hooks/use-live-query-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeader,
  PageBody,
  FilterPills,
  type FilterPillOption,
  PageTabs,
  type PageTabOption,
  RefreshingDataBadge,
} from "@/components/shared";

// ── Tab config ─────────────────────────────────────────────────────────────────

interface TabConfig {
  id: AnalyticsTab;
  label: string;
  Icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { id: "overview", label: "Overview", Icon: ChartLineIcon },
  { id: "collection", label: "Collection", Icon: FunnelIcon },
  { id: "pipeline", label: "Pipeline", Icon: CheckSquareIcon },
  { id: "engagement", label: "Engagement", Icon: GaugeIcon },
  { id: "sources", label: "Sources", Icon: GlobeIcon },
  { id: "api", label: "API", Icon: CodeIcon },
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

  const days = useMemo(
    () => Math.min(Math.max(getRangeDays(dateRange), 1), 365),
    [dateRange],
  );

  const projectQuery = useProject(projectSlug);
  const dashboardQuery = useAnalyticsDashboard(projectSlug, {
    days,
    compare,
  });

  const dashboardState = useLiveQueryState(dashboardQuery);

  const data: (DashboardData & { project: { name: string } }) | null =
    useMemo(() => {
      if (!dashboardQuery.data || !projectQuery.data) return null;
      return {
        project: { name: projectQuery.data.name },
        ...dtoToDashboardData(dashboardQuery.data),
      };
    }, [dashboardQuery.data, projectQuery.data]);

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
        <PageHeader
          contained
          title={<Skeleton className="h-5 w-40 animate-shimmer" />}
          description={
            <span className="inline-block h-3.5 w-64 animate-shimmer rounded bg-muted" />
          }
        />
        <PageBody contained padding="compact" stack>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-52 rounded-lg" />
        </PageBody>
      </div>
    );
  }

  const showComparison = compare === "prev";

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        contained
        title="Analytics"
        actions={
          <>
            <RefreshingDataBadge show={dashboardState.isBackgroundRefreshing} />
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
              <ArrowsClockwiseIcon
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
          <PageTabs<AnalyticsTab>
            className="-my-2.5 flex-1"
            aria-label="Analytics sections"
            options={TABS.map(
              ({ id, label, Icon }): PageTabOption<AnalyticsTab> => ({
                id,
                label,
                icon: Icon as PageTabOption<AnalyticsTab>["icon"],
              }),
            )}
            value={tab}
            onChange={setTab}
          />
        }
      />

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <PageBody
        contained
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
          <StatTile tile={data.kpis.approved} showComparison={showComparison} />
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
  data: DashboardData;
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
  const metricOptions: FilterPillOption<AnalyticsMetric>[] = [
    { id: "submissions", label: "Submissions" },
    { id: "approvals", label: "Approvals" },
    { id: "impressions", label: "Impressions" },
  ];

  return (
    <div className="space-y-4">
      {/* Hero chart with metric selector */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-foreground">Trends</h3>
          <FilterPills
            options={metricOptions}
            value={metric}
            onChange={onMetricChange}
            size="sm"
          />
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

      {/* Pipeline */}
      <PipelineCard data={data.pipeline} projectSlug={projectSlug} />

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

      <PipelineCard data={data.pipeline} projectSlug={projectSlug} />

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
      <ApiUsageCard keys={data.apiKeyUsage} projectSlug={projectSlug} />
    </div>
  );
}
