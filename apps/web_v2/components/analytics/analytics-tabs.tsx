"use client";

/**
 * The six analytics views, each a metric band over a stack of unbordered
 * sections.
 *
 * The old Overview stated the same three numbers four times in four idioms —
 * KPI tiles, then a chart of the moderation split, then a funnel of
 * impressions → submitted → approved, then a pipeline of the same statuses —
 * in four equal-weight boxes with nothing saying which mattered. Each tab now
 * opens with the band that summarises *that* tab and never repeats a fact
 * below it, and the global KPI strip no longer floats above the API tab
 * describing form submissions.
 *
 * Every panel owns its own empty state through `AnalyticsPanel`; the page owns
 * loading and failure, because all twelve panels are fed by one payload.
 */

import * as React from "react";
import Link from "next/link";
import {
  ChartBarIcon,
  ChatCircleTextIcon,
  ClockIcon,
  DevicesIcon,
  FunnelIcon,
  GlobeIcon,
  KeyIcon,
  SlidersIcon,
  StarIcon,
} from "@phosphor-icons/react";
import {
  EmptyState,
  FilterPills,
  MetricRow,
  MetricValue,
  NoResults,
  SectionStack,
  type DataStateResult,
  type FilterPillOption,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { fmtCount, fmtRating, timeAgo } from "@/lib/format";
import { compareMetric, fmtPercent } from "@/lib/analytics/range";
import {
  RATING_SCALE,
  type AnalyticsMetric,
  type AnalyticsTab,
  type DashboardData,
  type MetricPair,
  type TimeseriesPoint,
} from "@/lib/analytics/types";
import {
  developerKeysPath,
  formsPath,
  responsesPath,
  widgetsPath,
} from "@/lib/routes";
import { AnalyticsPanel, derivePanelState } from "./analytics-panel";
import {
  BreakdownSkeleton,
  ChartSkeleton,
  HeatmapSkeleton,
  TableSkeleton,
} from "./analytics-skeleton";
import { ApiUsageTable, NEAR_LIMIT_PERCENT } from "./api-usage-card";
import { ContentPerformanceTable } from "./content-performance-table";
import { DeviceSplitBreakdown } from "./device-split-card";
import { FunnelSteps } from "./funnel-card";
import { HeroChart, METRIC_SERIES } from "./hero-chart";
import { PipelineBreakdown } from "./pipeline-card";
import { RatingsDistribution } from "./ratings-distribution";
import { SubmissionHeatmap } from "./submission-heatmap";
import { TopCountriesTable } from "./top-countries-bar";
import { TopSourcesTable } from "./top-sources-list";
import { SLOW_LOAD_MS, WidgetEngagementTable } from "./widget-engagement-grid";

export interface TabContext {
  data: DashboardData;
  projectSlug: string;
  /** The page's data state; panels narrow it with their own row counts. */
  state: DataStateResult;
  /** True when the range is narrower or wider than the default window. */
  filtered: boolean;
  /**
   * True only when the selected window is *narrower* than the default, so
   * widening it could actually surface something. On a 90-day or year-to-date
   * range, "show last 30 days" would narrow the window that already found
   * nothing, which is not a recovery.
   */
  canWiden: boolean;
  rangeLabel: string;
  onResetRange: () => void;
  showComparison: boolean;
  metric: AnalyticsMetric;
  onMetricChange: (metric: AnalyticsMetric) => void;
}

export function AnalyticsTabBody({
  tab,
  context,
}: {
  tab: AnalyticsTab;
  context: TabContext;
}) {
  switch (tab) {
    case "collection":
      return <CollectionTab {...context} />;
    case "pipeline":
      return <PipelineTab {...context} />;
    case "engagement":
      return <EngagementTab {...context} />;
    case "sources":
      return <SourcesTab {...context} />;
    case "api":
      return <ApiTab {...context} />;
    default:
      return <OverviewTab {...context} />;
  }
}

// ── Metric helpers ───────────────────────────────────────────────────────────

/**
 * A count with its period-over-period movement. `compareMetric` decides whether
 * a percentage is even expressible — growth from zero and a missing previous
 * period are both notes, not deltas, and used to render as nothing at all.
 */
function CountMetric({
  label,
  pair,
  href,
  unit,
  compare,
}: {
  label: string;
  pair: MetricPair;
  href?: string;
  unit?: string;
  compare: boolean;
}) {
  const { delta, note } = compareMetric(pair, { enabled: compare });
  return (
    <MetricValue
      label={label}
      value={pair.current}
      unit={unit}
      href={href}
      delta={delta}
      hint={note}
    />
  );
}

/** A rate carries its own `%`, at one precision across the whole surface. */
function RateMetric({
  label,
  pair,
  compare,
  hint,
}: {
  label: string;
  pair: MetricPair;
  compare: boolean;
  hint?: React.ReactNode;
}) {
  const { delta, note } = compareMetric(pair, { enabled: compare });
  return (
    <MetricValue
      label={label}
      value={fmtPercent(pair.current, 1)}
      delta={delta}
      hint={note ?? hint}
    />
  );
}

/** A value with no previous period to compare against — a derived aggregate. */
function PlainMetric(props: {
  label: string;
  value: number | string | null;
  unit?: string;
  href?: string;
  hint?: React.ReactNode;
}) {
  return <MetricValue {...props} />;
}

// ── Empty surfaces ───────────────────────────────────────────────────────────

/**
 * A filtered miss is a different fact from a first run: the recovery is to
 * widen the window, not to go and create something.
 *
 * The recovery is only offered when it *is* one. Every empty in this file used
 * to end in "Show last 30 days", including on a 90-day or year-to-date window —
 * an action that narrows the range that already found nothing. A window that is
 * already wider than the default states the fact and offers nothing.
 */
function RangeEmpty({
  noun,
  rangeLabel,
  canWiden,
  onReset,
}: {
  noun: string;
  rangeLabel: string;
  canWiden: boolean;
  onReset: () => void;
}) {
  return (
    <NoResults
      title={`No ${noun} in the ${rangeLabel.toLowerCase()}`}
      description={
        canWiden
          ? "Nothing was recorded inside the selected window. A wider range may cover it."
          : "Nothing was recorded inside the selected window, which already reaches further back than the default."
      }
      action={
        canWiden ? (
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={onReset}
          >
            Show last 30 days
          </Button>
        ) : undefined
      }
    />
  );
}

/**
 * The window every range-scoped panel is really describing.
 *
 * The dashboard endpoint takes a day count and aggregates responses *created*
 * inside it — `pipeline`, `ratings`, `topSources`, and `contentPerformance` are
 * all built from that same windowed set. A panel over any of them must say so,
 * and must treat a narrowed range as a filter rather than as a first run.
 */
const RANGE_SCOPED_NOTE = "Counted from responses submitted inside this range.";

// ── Overview ─────────────────────────────────────────────────────────────────

const OVERVIEW_METRICS: FilterPillOption<AnalyticsMetric>[] = [
  { id: "collection", label: "Collection" },
  { id: "moderation", label: "Moderation" },
  { id: "impressions", label: "Impressions" },
];

function OverviewTab(ctx: TabContext) {
  const { data, projectSlug, showComparison } = ctx;
  const pipelineTotal =
    data.pipeline.pending +
    data.pipeline.approved +
    data.pipeline.rejected +
    data.pipeline.flagged;

  return (
    <>
      <MetricRow columns={4}>
        <CountMetric
          label="Form impressions"
          pair={data.totals.formImpressions}
          href={formsPath(projectSlug)}
          compare={showComparison}
        />
        <CountMetric
          label="Submissions"
          pair={data.totals.submissions}
          href={`${responsesPath(projectSlug)}?status=all`}
          compare={showComparison}
        />
        <RateMetric
          label="Approval rate"
          pair={data.totals.approvalRate}
          compare={showComparison}
          // A rate is only readable with its denominator named.
          hint="Of the decisions you took"
        />
        <PlainMetric
          label="Pending review"
          value={data.pipeline.pending}
          href={`${responsesPath(projectSlug)}?status=pending`}
        />
      </MetricRow>

      <SectionStack>
        <TrendPanel ctx={ctx} metrics={OVERVIEW_METRICS} />

        <AnalyticsPanel
          title="Collection funnel"
          description="How many people who saw a form went on to submit, and how many of those you approved."
          state={derivePanelState(ctx.state, {
            count: data.funnel.steps.length,
          })}
          resource="the collection funnel"
          skeleton={<BreakdownSkeleton rows={3} />}
          empty={
            <EmptyState
              icon={FunnelIcon}
              align="start"
              title="No funnel to draw yet"
              description="The funnel appears once a form has been seen at least once."
              action={
                <Button asChild size="sm" className="text-xs">
                  <Link href={formsPath(projectSlug)}>Share a form</Link>
                </Button>
              }
            />
          }
          divided
        >
          <FunnelSteps data={data.funnel} projectSlug={projectSlug} />
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Review pipeline"
          description={`Where the responses in this window currently stand. ${RANGE_SCOPED_NOTE}`}
          meta={`${fmtCount(pipelineTotal)} in range`}
          state={derivePanelState(ctx.state, {
            count: pipelineTotal,
            filtered: ctx.filtered,
          })}
          resource="the review pipeline"
          skeleton={<BreakdownSkeleton rows={4} />}
          empty={
            <EmptyState
              icon={ChatCircleTextIcon}
              align="start"
              title="No responses to review"
              description="Once people submit through your forms, they queue here for approval."
              action={
                <Button asChild size="sm" className="text-xs">
                  <Link href={responsesPath(projectSlug)}>Open Responses</Link>
                </Button>
              }
            />
          }
          filteredEmpty={
            <RangeEmpty
              noun="responses"
              rangeLabel={ctx.rangeLabel}
              canWiden={ctx.canWiden}
              onReset={ctx.onResetRange}
            />
          }
          divided
        >
          <PipelineBreakdown data={data.pipeline} projectSlug={projectSlug} />
        </AnalyticsPanel>
      </SectionStack>
    </>
  );
}

/**
 * How much the selected metric actually carries across the range. Zero means
 * the chart has nothing to draw, however many days the API returned.
 */
function seriesTotal(
  points: TimeseriesPoint[],
  metric: AnalyticsMetric,
): number {
  const keys = METRIC_SERIES[metric].series.map((s) => s.key);
  let total = 0;
  for (const point of points) {
    for (const key of keys) {
      const value = point[key];
      if (typeof value === "number" && Number.isFinite(value)) total += value;
    }
  }
  return total;
}

/** The trend chart, with whichever metric list the tab offers. */
function TrendPanel({
  ctx,
  metrics,
  title = "Trends",
  description = "Daily counts across the selected range.",
  metric,
  divided = false,
}: {
  ctx: TabContext;
  metrics?: FilterPillOption<AnalyticsMetric>[];
  title?: string;
  description?: string;
  metric?: AnalyticsMetric;
  divided?: boolean;
}) {
  // A tab that offers a pill list owns the vocabulary for `?metric=`. The
  // dashboard validates that parameter against the whole series registry, which
  // is a superset of what any one tab offers — so `?metric=widgets` on Overview
  // used to plot a series no pill in the list could select, leaving the group
  // with nothing marked active.
  const requested = metric ?? ctx.metric;
  const active =
    metrics && !metrics.some((option) => option.id === requested)
      ? (metrics[0]?.id ?? requested)
      : requested;

  return (
    <AnalyticsPanel
      title={title}
      description={description}
      actions={
        metrics && (
          <FilterPills
            options={metrics}
            value={active}
            onChange={ctx.onMetricChange}
            size="sm"
            aria-label="Trend metric"
          />
        )
      }
      // The API returns a row per day in the range, so `timeseries.length` is
      // 30 even when every value is zero — which drew a full-height chart with
      // a flat line on the axis and called it data. What makes the panel empty
      // is the *selected metric* having nothing in it, not the range having
      // no days.
      state={derivePanelState(ctx.state, {
        count: seriesTotal(ctx.data.timeseries, active),
        filtered: ctx.filtered,
      })}
      resource="the trend chart"
      skeleton={<ChartSkeleton />}
      empty={
        <EmptyState
          icon={ChartBarIcon}
          align="start"
          title="Nothing recorded yet"
          description="Daily activity appears here as soon as a form is viewed or a widget loads."
        />
      }
      filteredEmpty={
        <RangeEmpty
          noun="activity"
          rangeLabel={ctx.rangeLabel}
          canWiden={ctx.canWiden}
          onReset={ctx.onResetRange}
        />
      }
      divided={divided}
    >
      <HeroChart
        series={ctx.data.timeseries}
        prevSeries={ctx.data.prevTimeseries}
        metric={active}
        showComparison={ctx.showComparison}
      />
    </AnalyticsPanel>
  );
}

// ── Collection ───────────────────────────────────────────────────────────────

function CollectionTab(ctx: TabContext) {
  const { data, projectSlug, showComparison } = ctx;
  const heatmapTotal = data.submissionsByDayHour.reduce(
    (sum, cell) => sum + cell.count,
    0,
  );

  return (
    <>
      <MetricRow columns={4}>
        <CountMetric
          label="Form impressions"
          pair={data.totals.formImpressions}
          href={formsPath(projectSlug)}
          compare={showComparison}
        />
        <CountMetric
          label="Submissions"
          pair={data.totals.submissions}
          href={`${responsesPath(projectSlug)}?status=all`}
          compare={showComparison}
        />
        <RateMetric
          label="Conversion rate"
          pair={data.totals.conversionRate}
          compare={showComparison}
          hint="Submissions per form impression"
        />
        <PlainMetric
          label="Average rating"
          value={
            data.ratings.average === null
              ? null
              : fmtRating(Number(data.ratings.average.toFixed(1)), RATING_SCALE)
          }
          hint={`${fmtCount(data.ratings.total)} rated`}
        />
      </MetricRow>

      <SectionStack>
        <TrendPanel
          ctx={ctx}
          metric="collection"
          title="Impressions and submissions"
          description="Form impressions against the submissions they produced, day by day."
        />

        <AnalyticsPanel
          title="Collection funnel"
          description="Where people drop out between seeing a form and being approved."
          state={derivePanelState(ctx.state, {
            count: data.funnel.steps.length,
          })}
          resource="the collection funnel"
          skeleton={<BreakdownSkeleton rows={3} />}
          empty={
            <EmptyState
              icon={FunnelIcon}
              align="start"
              title="No funnel to draw yet"
              description="The funnel appears once a form has been seen at least once."
            />
          }
          divided
        >
          <FunnelSteps data={data.funnel} projectSlug={projectSlug} />
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Ratings"
          description={`Distribution across the ${RATING_SCALE}-point scale, including the buckets nobody chose. ${RANGE_SCOPED_NOTE}`}
          meta={`${fmtCount(data.ratings.total)} rated`}
          state={derivePanelState(ctx.state, {
            count: data.ratings.total,
            filtered: ctx.filtered,
          })}
          resource="ratings"
          skeleton={<BreakdownSkeleton rows={5} />}
          empty={
            <EmptyState
              icon={StarIcon}
              align="start"
              title="No ratings yet"
              description="Add a rating question to a form and the scores will break down here."
              action={
                <Button asChild size="sm" className="text-xs">
                  <Link href={formsPath(projectSlug)}>Edit a form</Link>
                </Button>
              }
            />
          }
          filteredEmpty={
            <RangeEmpty
              noun="ratings"
              rangeLabel={ctx.rangeLabel}
              canWiden={ctx.canWiden}
              onReset={ctx.onResetRange}
            />
          }
          divided
        >
          <RatingsDistribution data={data.ratings} />
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Submission activity"
          description="Which hours of the week people actually submit, in your browser's timezone."
          state={derivePanelState(ctx.state, {
            count: heatmapTotal,
            filtered: ctx.filtered,
          })}
          resource="submission activity"
          skeleton={<HeatmapSkeleton />}
          empty={
            <EmptyState
              icon={ClockIcon}
              align="start"
              title="No submissions to plot"
              description="The day-by-hour grid fills in once responses start arriving."
            />
          }
          filteredEmpty={
            <RangeEmpty
              noun="submissions"
              rangeLabel={ctx.rangeLabel}
              canWiden={ctx.canWiden}
              onReset={ctx.onResetRange}
            />
          }
          divided
        >
          <SubmissionHeatmap data={data.submissionsByDayHour} />
        </AnalyticsPanel>
      </SectionStack>
    </>
  );
}

// ── Pipeline ─────────────────────────────────────────────────────────────────

function PipelineTab(ctx: TabContext) {
  const { data, projectSlug, showComparison } = ctx;
  const pipelineTotal =
    data.pipeline.pending +
    data.pipeline.approved +
    data.pipeline.rejected +
    data.pipeline.flagged;

  return (
    <>
      <MetricRow columns={4}>
        <PlainMetric
          label="Pending review"
          value={data.pipeline.pending}
          href={`${responsesPath(projectSlug)}?status=pending`}
        />
        <CountMetric
          label="Approved"
          pair={data.totals.approved}
          href={`${responsesPath(projectSlug)}?status=approved`}
          compare={showComparison}
        />
        <CountMetric
          label="Rejected"
          pair={data.totals.rejected}
          href={`${responsesPath(projectSlug)}?status=declined`}
          compare={showComparison}
        />
        <CountMetric
          label="Flagged"
          pair={data.totals.flagged}
          compare={showComparison}
        />
      </MetricRow>

      <SectionStack>
        <TrendPanel
          ctx={ctx}
          metric="moderation"
          title="Moderation over time"
          description="Approved, rejected, and flagged responses stacked by day."
        />

        <AnalyticsPanel
          title="Review pipeline"
          description={`Where the responses in this window currently stand. ${RANGE_SCOPED_NOTE}`}
          meta={`${fmtCount(pipelineTotal)} in range`}
          state={derivePanelState(ctx.state, {
            count: pipelineTotal,
            filtered: ctx.filtered,
          })}
          resource="the review pipeline"
          skeleton={<BreakdownSkeleton rows={4} />}
          empty={
            <EmptyState
              icon={ChatCircleTextIcon}
              align="start"
              title="No responses to review"
              description="Once people submit through your forms, they queue here for approval."
            />
          }
          filteredEmpty={
            <RangeEmpty
              noun="responses"
              rangeLabel={ctx.rangeLabel}
              canWiden={ctx.canWiden}
              onReset={ctx.onResetRange}
            />
          }
          divided
        >
          <PipelineBreakdown data={data.pipeline} projectSlug={projectSlug} />
        </AnalyticsPanel>

        <ContentPerformancePanel ctx={ctx} />
      </SectionStack>
    </>
  );
}

function ContentPerformancePanel({ ctx }: { ctx: TabContext }) {
  const { data, projectSlug } = ctx;
  return (
    <AnalyticsPanel
      title="Response performance"
      // The dashboard payload returns a fixed top slice with no total and no
      // page cursor, so there is no pagination affordance to render — the size
      // of what arrived is stated instead of implied.
      description={`Responses ranked by how often a widget has shown them. The API returns the ten busiest, not the full list. ${RANGE_SCOPED_NOTE}`}
      meta={`${fmtCount(data.contentPerformance.length)} ranked`}
      state={derivePanelState(ctx.state, {
        count: data.contentPerformance.length,
        filtered: ctx.filtered,
      })}
      resource="response performance"
      skeleton={<TableSkeleton rows={5} columns={5} />}
      empty={
        <EmptyState
          icon={ChatCircleTextIcon}
          align="start"
          title="Nothing has been shown yet"
          description="A response ranks here once a widget carrying it has been loaded."
          action={
            <Button asChild size="sm" className="text-xs">
              <Link href={widgetsPath(projectSlug)}>Build a widget</Link>
            </Button>
          }
        />
      }
      filteredEmpty={
        <RangeEmpty
          noun="ranked responses"
          rangeLabel={ctx.rangeLabel}
          canWiden={ctx.canWiden}
          onReset={ctx.onResetRange}
        />
      }
      divided
    >
      <ContentPerformanceTable
        rows={data.contentPerformance}
        projectSlug={projectSlug}
      />
    </AnalyticsPanel>
  );
}

// ── Engagement ───────────────────────────────────────────────────────────────

function EngagementTab(ctx: TabContext) {
  const { data, projectSlug } = ctx;

  const loads = data.widgetEngagement.reduce((sum, w) => sum + w.totalLoads, 0);
  const impressions = data.widgetEngagement.reduce(
    (sum, w) => sum + w.impressions,
    0,
  );
  const errors = data.widgetEngagement.reduce(
    (sum, w) => sum + w.errorCount,
    0,
  );
  // Weighted by loads: averaging four widget averages would let a widget with
  // one load outvote one with ten thousand.
  const weighted = data.widgetEngagement.reduce(
    (sum, w) => sum + (w.avgLoadMs ?? 0) * w.totalLoads,
    0,
  );
  const avgLoad = loads > 0 ? Math.round(weighted / loads) : null;
  const deviceTotal =
    data.deviceSplit.mobile +
    data.deviceSplit.tablet +
    data.deviceSplit.desktop +
    data.deviceSplit.unknown;

  return (
    <>
      <MetricRow columns={4}>
        <PlainMetric
          label="Widget loads"
          value={loads}
          href={widgetsPath(projectSlug)}
        />
        <PlainMetric label="Testimonial impressions" value={impressions} />
        <PlainMetric
          label="Average load"
          value={avgLoad}
          unit="ms"
          hint={`Flagged above ${SLOW_LOAD_MS} ms`}
        />
        <PlainMetric label="Errors" value={errors} />
      </MetricRow>

      <SectionStack>
        <TrendPanel
          ctx={ctx}
          metric="widgets"
          title="Widget impressions over time"
          description="How often testimonials were shown by your embedded widgets."
        />

        <AnalyticsPanel
          // The endpoint lists a widget only once it has loaded inside the
          // window, so this counts widgets that were *active*, not widgets that
          // exist. An empty here is "nothing loaded", never "nothing built" —
          // the old copy sent a project with five live widgets to go and build
          // its first one.
          title="Widget performance"
          description={`Loads, impressions, and load time for every widget that loaded in this range. A widget is called slow above ${SLOW_LOAD_MS} ms.`}
          meta={`${fmtCount(data.widgetEngagement.length)} active`}
          state={derivePanelState(ctx.state, {
            count: data.widgetEngagement.length,
            filtered: ctx.filtered,
          })}
          resource="widget performance"
          skeleton={<TableSkeleton rows={4} columns={6} />}
          empty={
            <EmptyState
              icon={SlidersIcon}
              align="start"
              title="No widget loads recorded"
              description="Widgets embed approved testimonials on your site. Load time and impressions are tracked from the first time an embed is served."
              action={
                <Button asChild size="sm" className="text-xs">
                  <Link href={widgetsPath(projectSlug)}>Open Widgets</Link>
                </Button>
              }
            />
          }
          filteredEmpty={
            <RangeEmpty
              noun="widget loads"
              rangeLabel={ctx.rangeLabel}
              canWiden={ctx.canWiden}
              onReset={ctx.onResetRange}
            />
          }
          divided
        >
          <WidgetEngagementTable
            widgets={data.widgetEngagement}
            projectSlug={projectSlug}
          />
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Devices"
          description="Which devices widgets loaded on. Unreported loads stay in the denominator, so the known shares aren't inflated."
          state={derivePanelState(ctx.state, {
            count: deviceTotal,
            filtered: ctx.filtered,
          })}
          resource="device data"
          skeleton={<BreakdownSkeleton rows={4} />}
          empty={
            <EmptyState
              icon={DevicesIcon}
              align="start"
              title="No widget loads recorded"
              description="The device breakdown fills in the first time a widget loads on a visitor's page."
            />
          }
          filteredEmpty={
            <RangeEmpty
              noun="widget loads"
              rangeLabel={ctx.rangeLabel}
              canWiden={ctx.canWiden}
              onReset={ctx.onResetRange}
            />
          }
          divided
        >
          <DeviceSplitBreakdown data={data.deviceSplit} />
        </AnalyticsPanel>
      </SectionStack>
    </>
  );
}

// ── Sources ──────────────────────────────────────────────────────────────────

/** How many regions the dashboard endpoint returns. Beyond this it truncates. */
const TOP_REGION_LIMIT = 10;

function SourcesTab(ctx: TabContext) {
  const { data, projectSlug, showComparison } = ctx;
  const verifiedSources = data.topSources.filter((s) => s.oauthVerified).length;

  return (
    <>
      <MetricRow columns={4}>
        <CountMetric
          label="Submissions"
          pair={data.totals.submissions}
          href={`${responsesPath(projectSlug)}?status=all`}
          compare={showComparison}
        />
        <PlainMetric
          label="Sources tracked"
          value={data.topSources.length}
          hint={`${fmtCount(verifiedSources)} with verified identity`}
        />
        <PlainMetric
          label="Identity verified"
          value={fmtPercent(data.oauthVerifiedShare, 0)}
          hint="Share of submissions signed in through a provider"
        />
        {/* The endpoint returns the ten busiest regions and nothing else, so
            this is a count of what came back — not of how many regions the
            project has been seen from. It says which it is. */}
        <PlainMetric
          label="Regions seen"
          value={data.topCountries.length}
          hint={`Top ${TOP_REGION_LIMIT} by impressions`}
        />
      </MetricRow>

      <SectionStack>
        <AnalyticsPanel
          title="Submission sources"
          description="Where responses came from, and how many of each survived review."
          state={derivePanelState(ctx.state, {
            count: data.topSources.length,
            filtered: ctx.filtered,
          })}
          resource="submission sources"
          skeleton={<TableSkeleton rows={5} columns={3} />}
          empty={
            <EmptyState
              icon={GlobeIcon}
              align="start"
              title="No source data yet"
              description="Share a collection link and Semblia records where each submission came from."
              action={
                <Button asChild size="sm" className="text-xs">
                  <Link href={formsPath(projectSlug)}>Share a form</Link>
                </Button>
              }
            />
          }
          filteredEmpty={
            <RangeEmpty
              noun="submissions"
              rangeLabel={ctx.rangeLabel}
              canWiden={ctx.canWiden}
              onReset={ctx.onResetRange}
            />
          }
        >
          <TopSourcesTable sources={data.topSources} />
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Where widgets are seen"
          description={`Impressions by the visitor's region, as reported by the request. The API returns the ${TOP_REGION_LIMIT} busiest; loads with no region stay in the total.`}
          state={derivePanelState(ctx.state, {
            count: data.topCountries.length,
            filtered: ctx.filtered,
          })}
          resource="regional impressions"
          skeleton={<TableSkeleton rows={5} columns={3} />}
          empty={
            <EmptyState
              icon={GlobeIcon}
              align="start"
              title="No impressions recorded"
              description="Regions appear once an embedded widget has been loaded by a visitor."
            />
          }
          filteredEmpty={
            <RangeEmpty
              noun="impressions"
              rangeLabel={ctx.rangeLabel}
              canWiden={ctx.canWiden}
              onReset={ctx.onResetRange}
            />
          }
          divided
        >
          <TopCountriesTable countries={data.topCountries} />
        </AnalyticsPanel>
      </SectionStack>
    </>
  );
}

// ── API ──────────────────────────────────────────────────────────────────────

function ApiTab(ctx: TabContext) {
  const { data, projectSlug } = ctx;
  const keys = data.apiKeyUsage;
  const requests = keys.reduce((sum, k) => sum + k.usageCount, 0);
  const active = keys.filter((k) => k.isActive).length;
  const nearLimit = keys.filter(
    (k) =>
      k.usageLimit !== null &&
      k.usageLimit > 0 &&
      (k.usageCount / k.usageLimit) * 100 >= NEAR_LIMIT_PERCENT,
  ).length;
  const lastUsed = keys.reduce<Date | null>(
    (latest, k) =>
      k.lastUsedAt && (!latest || k.lastUsedAt > latest)
        ? k.lastUsedAt
        : latest,
    null,
  );

  return (
    <>
      <MetricRow columns={4}>
        <PlainMetric label="Requests" value={requests} />
        <PlainMetric
          label="Keys"
          value={keys.length}
          href={developerKeysPath(projectSlug)}
        />
        <PlainMetric label="Active" value={active} />
        <PlainMetric
          label="Last request"
          value={lastUsed ? timeAgo(lastUsed) : null}
          hint={
            nearLimit > 0
              ? `${fmtCount(nearLimit)} at ${NEAR_LIMIT_PERCENT}% of quota or more`
              : undefined
          }
        />
      </MetricRow>

      <SectionStack>
        <AnalyticsPanel
          title="API keys"
          description={`Request volume per key. A key is called out at ${NEAR_LIMIT_PERCENT}% of its quota.`}
          meta={`${fmtCount(keys.length)} ${keys.length === 1 ? "key" : "keys"}`}
          actions={
            <Button asChild size="sm" variant="outline" className="text-xs">
              <Link href={developerKeysPath(projectSlug)}>Manage keys</Link>
            </Button>
          }
          state={derivePanelState(ctx.state, { count: keys.length })}
          resource="API usage"
          skeleton={<TableSkeleton rows={3} columns={6} />}
          empty={
            <EmptyState
              icon={KeyIcon}
              align="start"
              title="No API keys yet"
              description="Keys let your own services read approved testimonials. Usage is tracked from the first request."
              action={
                <Button asChild size="sm" className="text-xs">
                  <Link href={developerKeysPath(projectSlug)}>
                    Create a key
                  </Link>
                </Button>
              }
            />
          }
        >
          <ApiUsageTable keys={keys} />
        </AnalyticsPanel>
      </SectionStack>
    </>
  );
}
