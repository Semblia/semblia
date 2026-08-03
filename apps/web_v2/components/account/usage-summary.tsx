"use client";

/**
 * The "Usage" section.
 *
 * The old meter had two honesty problems the metric contract exists to prevent:
 *
 *   1. A limit of `0` — which is what the API sends when a plan's limit record
 *      is missing — was treated as "no cap", so the bar sat at 0% and the row
 *      read as healthy. An unknown limit is unknown, never unlimited.
 *   2. A usage of `0` and a usage the request never returned looked identical.
 *      `MetricValue` keeps them apart: a real `0` renders `0`, an absent value
 *      renders an em dash and says it is unavailable.
 *
 * It is also no longer a bordered box: metrics are siblings in one
 * hairline-separated band that sits on the page background, so this is an
 * unbounded `Section` rather than a settings fieldset. A `MetricRow` inside a
 * card would put its own surface on top of that card, which is the nesting
 * defect in miniature.
 */

import {
  DataState,
  MetricRow,
  MetricValue,
  Section,
  useDataState,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingUsage } from "@/hooks/api";
import { fmtCount } from "@/lib/format";
import { homePath } from "@/lib/routes";
import type { V2UsageLimitDTO } from "@workspace/types";

export function UsageSummary() {
  const usageQuery = useBillingUsage({ freshOnMount: true });
  const state = useDataState(usageQuery, { requireFreshOnMount: true });
  const usage = usageQuery.data;

  // Only the metrics this section actually shows may raise the upgrade
  // affordance — an at-limit count the reader can't see would be an
  // unexplained call to action.
  const atLimit = usage
    ? [usage.responses, usage.widgets, usage.projects].some(isAtLimit)
    : false;

  return (
    <Section
      id="usage"
      title="Usage"
      description="What this account has collected against the limits of its plan."
      // Unbounded sections still live on the settings page's gutter grid —
      // without it this band ran viewport-edge to viewport-edge while every
      // fieldset around it sat inside px-4/px-6.
      className="border-b border-border px-4 py-6 sm:px-6"
      actions={
        atLimit ? (
          <Button asChild size="sm" variant="outline">
            <a href="#plans">View plans</a>
          </Button>
        ) : undefined
      }
    >
      <DataState
        state={state}
        resource="your usage"
        align="start"
        compactError
        skeleton={<UsageSkeleton />}
      >
        <MetricRow columns={3}>
          <MetricValue
            label="Responses collected"
            value={usedOrAbsent(usage?.responses)}
            hint={limitHint(usage?.responses)}
          />
          <MetricValue
            label="Widgets published"
            value={usedOrAbsent(usage?.widgets)}
            hint={limitHint(usage?.widgets)}
          />
          {/* Projects is the one account-wide count with an account-wide view
              behind it; responses and widgets only exist inside a project, so
              there is no single list for those numbers to lead to. */}
          <MetricValue
            label="Projects"
            value={usedOrAbsent(usage?.projects)}
            hint={limitHint(usage?.projects)}
            href={homePath()}
          />
        </MetricRow>
      </DataState>
    </Section>
  );
}

/** A real `0` stays `0`; a value the request never returned becomes `null`. */
function usedOrAbsent(entry: V2UsageLimitDTO | undefined): number | null {
  if (!entry || !Number.isFinite(entry.used)) return null;
  return entry.used;
}

/**
 * One line of context under the number. A limit that is absent, non-finite, or
 * non-positive is stated as unavailable — rendering "unlimited" there would
 * invite work the API refuses the moment the real cap is hit.
 */
function limitHint(entry: V2UsageLimitDTO | undefined): string {
  if (!entry) return "Limit unavailable";
  const { used, limit } = entry;
  if (!Number.isFinite(limit) || limit <= 0) return "Plan limit unavailable";
  // The usage can be absent too — `usedOrAbsent` already renders an em dash for
  // it. A percentage derived from it would be `NaN% of 1,000`, or a fabricated
  // `0%` reading as healthy underneath a value that says it is unknown. State
  // the cap alone: that part is still a fact.
  if (!Number.isFinite(used)) return `Plan limit ${fmtCount(limit)}`;
  if (used >= limit) return `At the plan limit of ${fmtCount(limit)}`;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return `${pct}% of ${fmtCount(limit)}`;
}

function isAtLimit(entry: V2UsageLimitDTO): boolean {
  return (
    Number.isFinite(entry.limit) && entry.limit > 0 && entry.used >= entry.limit
  );
}

// ── Cold load ──────────────────────────────────────────────────────────────────

// Three metric slots on the same grid as the real band, so nothing shifts. The
// classes mirror `MetricRow` exactly — including its breakpoints, which step
// 1 → 2 → 3 columns, and its cell inset, which is uniform rather than flush on
// the first cell.
function UsageSkeleton() {
  return (
    <div
      aria-hidden
      className="grid grid-cols-1 gap-px overflow-hidden bg-border sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="space-y-2 bg-background px-4 py-3.5 sm:px-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      ))}
    </div>
  );
}
