"use client";

/**
 * AnalyticsDashboard — the page chrome, the URL state, and the one query.
 *
 * The rebuild fixes three P0s that all lived in one `if (!data)` gate:
 *
 *   • **A failed fetch shimmered forever.** There was no `isError` branch
 *     anywhere in the file, so on failure `data` stayed null and the surface
 *     returned its loading skeleton — permanently, with no message and no
 *     retry. `useDataState` derives the state error-first, which makes that
 *     shape impossible to write.
 *   • **Changing the range blanked the controls you just used.** Every range
 *     change and compare toggle mints a cold query key, and the loading branch
 *     rendered a `PageHeader` with no actions and no toolbar — so the picker,
 *     the compare button, and all six tabs vanished at the moment of
 *     interaction. The header is now outside the data boundary and never
 *     unmounts.
 *   • **A query parameter could crash the route.** `?metric=bogus` was cast
 *     straight to the union, and the chart then iterated `undefined`. Every
 *     URL-sourced value is validated against its own vocabulary and falls back.
 *
 * Also gone: the second query. `useProject` was fetched purely to read a name
 * that no element rendered, and its failure took the whole dashboard down.
 */

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowsClockwiseIcon,
  ChartLineIcon,
  CheckSquareIcon,
  CodeIcon,
  FunnelIcon,
  GaugeIcon,
  GlobeIcon,
} from "@phosphor-icons/react";
import {
  DataState,
  HeaderSep,
  PageBody,
  PageHeader,
  PageTabs,
  RefreshingDataBadge,
  useDataState,
  type PageTabOption,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useAnalyticsDashboard } from "@/hooks/api";
import { dtoToDashboardData } from "@/lib/analytics/dto-adapter";
import {
  DEFAULT_RANGE,
  RANGE_LABELS,
  isAnalyticsRange,
  requestDays,
  resolveRange,
} from "@/lib/analytics/range";
import type {
  AnalyticsCompare,
  AnalyticsMetric,
  AnalyticsRange,
  AnalyticsTab,
} from "@/lib/analytics/types";
import { AnalyticsBodySkeleton } from "./analytics-skeleton";
import { AnalyticsTabBody } from "./analytics-tabs";
import { METRIC_SERIES } from "./hero-chart";
import { RangePicker } from "./range-picker";

// ── Vocabularies ─────────────────────────────────────────────────────────────

const TABS: { id: AnalyticsTab; label: string; icon: PageTabOption["icon"] }[] =
  [
    { id: "overview", label: "Overview", icon: ChartLineIcon },
    { id: "collection", label: "Collection", icon: FunnelIcon },
    { id: "pipeline", label: "Pipeline", icon: CheckSquareIcon },
    { id: "engagement", label: "Engagement", icon: GaugeIcon },
    { id: "sources", label: "Sources", icon: GlobeIcon },
    { id: "api", label: "API", icon: CodeIcon },
  ];

const DEFAULT_TAB: AnalyticsTab = "overview";
const DEFAULT_METRIC: AnalyticsMetric = "collection";
const DEFAULT_COMPARE: AnalyticsCompare = "prev";

/**
 * Every value read from the URL is validated here. `.claude/rules/web-v2.md`
 * requires `?? FALLBACK` on API enum maps; a URL is a less trustworthy source
 * than the API, and `?tab=lol` used to render a page with a header and nothing
 * under it while `?metric=lol` threw.
 */
function readTab(value: string | null): AnalyticsTab {
  return TABS.some((t) => t.id === value)
    ? (value as AnalyticsTab)
    : DEFAULT_TAB;
}

function readMetric(value: string | null): AnalyticsMetric {
  return value && value in METRIC_SERIES
    ? (value as AnalyticsMetric)
    : DEFAULT_METRIC;
}

function readRange(value: string | null): AnalyticsRange {
  return value && isAnalyticsRange(value) ? value : DEFAULT_RANGE;
}

function readCompare(value: string | null): AnalyticsCompare {
  return value === "none" ? "none" : DEFAULT_COMPARE;
}

// ── URL state ────────────────────────────────────────────────────────────────

function useAnalyticsState() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const push = React.useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined) params.delete(key);
        else params.set(key, value);
      }
      // Defaults are stripped so a shared URL carries only what was chosen.
      if (params.get("tab") === DEFAULT_TAB) params.delete("tab");
      if (params.get("range") === DEFAULT_RANGE) params.delete("range");
      if (params.get("compare") === DEFAULT_COMPARE) params.delete("compare");
      if (params.get("metric") === DEFAULT_METRIC) params.delete("metric");
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  return {
    tab: readTab(searchParams.get("tab")),
    range: readRange(searchParams.get("range")),
    compare: readCompare(searchParams.get("compare")),
    metric: readMetric(searchParams.get("metric")),
    customFrom: searchParams.get("from") ?? undefined,
    customTo: searchParams.get("to") ?? undefined,
    push,
  };
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export function AnalyticsDashboard({ projectSlug }: { projectSlug: string }) {
  const [isPending, startTransition] = React.useTransition();
  const { tab, range, compare, metric, customFrom, customTo, push } =
    useAnalyticsState();

  const days = React.useMemo(
    () => requestDays(resolveRange(range, customFrom, customTo)),
    [range, customFrom, customTo],
  );

  // "Show last 30 days" is only a recovery from a *narrower* window. On a
  // 90-day or year-to-date range it narrows the window that already found
  // nothing, so the filtered-empty surfaces drop the action instead.
  const defaultDays = React.useMemo(
    () => requestDays(resolveRange(DEFAULT_RANGE)),
    [],
  );

  const dashboardQuery = useAnalyticsDashboard(projectSlug, { days, compare });
  const state = useDataState(dashboardQuery);

  const data = React.useMemo(
    () =>
      dashboardQuery.data ? dtoToDashboardData(dashboardQuery.data) : null,
    [dashboardQuery.data],
  );

  const showComparison = compare === "prev" && (data?.hasComparison ?? false);

  const setTab = (next: AnalyticsTab) =>
    startTransition(() => push({ tab: next }));

  const setRange = (next: AnalyticsRange, from?: string, to?: string) =>
    startTransition(() => push({ range: next, from, to }));

  const resetRange = () => setRange(DEFAULT_RANGE);

  const toggleCompare = () =>
    startTransition(() =>
      push({ compare: compare === "prev" ? "none" : "prev" }),
    );

  return (
    <div className="flex flex-1 flex-col">
      {/* Identity and state only. The header sits outside the data boundary, so
          the control that scopes the query cannot disappear while it runs. */}
      <PageHeader
        title="Analytics"
        description={
          <>
            {RANGE_LABELS[range]}
            <HeaderSep />
            {compare === "prev"
              ? data && !data.hasComparison
                ? "No previous period available"
                : "Compared with the previous period"
              : "No comparison"}
          </>
        }
        actions={
          <>
            <RefreshingDataBadge show={state.isRefreshing} />
            <Button
              variant={compare === "prev" ? "secondary" : "outline"}
              size="sm"
              onClick={toggleCompare}
              aria-pressed={compare === "prev"}
              className="h-8 gap-1.5 px-3 text-xs"
            >
              <ArrowsClockwiseIcon
                weight={compare === "prev" ? "fill" : "regular"}
                className="size-3.5"
                aria-hidden
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
              ({ id, label, icon }): PageTabOption<AnalyticsTab> => ({
                id,
                label,
                icon,
              }),
            )}
            value={tab}
            onChange={setTab}
          />
        }
      />

      {/* `aria-busy` rather than `pointer-events-none`: disabling the pointer
          left every link Tab-reachable and Enter-activatable, so keyboard users
          could act on a surface mouse users could not. */}
      <PageBody padding="compact" aria-busy={isPending || undefined}>
        {/* Every panel on this page is fed by one payload, so an outage is one
            outage: the rule caps outage messages at five per page, and a tab
            with five panels would otherwise repeat the same failure five times.
            Panels still narrow this state through `derivePanelState`, which is
            what keeps a failure outranking emptiness inside each of them. */}
        <DataState
          state={state}
          resource="analytics"
          align="start"
          className="gap-6"
          skeleton={<AnalyticsBodySkeleton />}
        >
          {data ? (
            <AnalyticsTabBody
              tab={tab}
              context={{
                data,
                projectSlug,
                state,
                filtered: range !== DEFAULT_RANGE,
                canWiden: days < defaultDays,
                rangeLabel: RANGE_LABELS[range],
                onResetRange: resetRange,
                showComparison,
                metric,
                onMetricChange: (next) => push({ metric: next }),
              }}
            />
          ) : null}
        </DataState>
      </PageBody>
    </div>
  );
}
