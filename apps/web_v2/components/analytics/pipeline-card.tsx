"use client";

/**
 * PipelineBreakdown — where the project's responses currently stand.
 *
 * Three separate lies lived in this panel. The auto-moderation headline divided
 * by the pipeline total while the caption beneath it divided by
 * `totalWithAutoMod`, so the card read "25%" directly above "25 of 50". A
 * status with a count of zero was filtered out of the legend entirely, so
 * "nothing was rejected" and "the API didn't return rejected" looked the same
 * and the panel's height jumped between ranges. And two of the four legend rows
 * linked to inbox filters the Responses list silently discards.
 *
 * Every status now renders, including its zero; the auto-moderation share and
 * its caption share one denominator; and a status with no inbox filter behind
 * it is not offered as a link.
 */

import { DefinitionList } from "@/components/shared";
import { Progress } from "@/components/ui/progress";
import { fmtCount, orDash } from "@/lib/format";
import { fmtHours, fmtPercent } from "@/lib/analytics/range";
import { responsesPath } from "@/lib/routes";
import type { PipelineData } from "@/lib/analytics/types";
import {
  BreakdownList,
  ProportionBar,
  type BreakdownSegment,
} from "./breakdown";

interface PipelineBreakdownProps {
  data: PipelineData;
  projectSlug: string;
}

/**
 * The Responses inbox validates `?status=` against its own filter set and falls
 * back to the default when it doesn't recognise a value. "Flagged" is not one
 * of them — it is a moderation-run outcome, not a review status — so that row
 * carries no link rather than dropping the user on an unfiltered list.
 */
function segmentsFor(data: PipelineData, slug: string): BreakdownSegment[] {
  const inbox = responsesPath(slug);
  return [
    {
      key: "approved",
      label: "Approved",
      value: data.approved,
      color: "var(--color-success)",
      href: `${inbox}?status=approved`,
    },
    {
      key: "pending",
      label: "Pending review",
      value: data.pending,
      color: "var(--color-brand)",
      href: `${inbox}?status=pending`,
    },
    {
      key: "flagged",
      label: "Flagged by the automated check",
      value: data.flagged,
      color: "var(--color-warning)",
    },
    {
      key: "rejected",
      label: "Rejected",
      value: data.rejected,
      color: "var(--color-destructive)",
      href: `${inbox}?status=declined`,
    },
  ];
}

export function PipelineBreakdown({
  data,
  projectSlug,
}: PipelineBreakdownProps) {
  const segments = segmentsFor(data, projectSlug);
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  // One denominator, used by the share, the bar, and the caption alike.
  const autoModShare =
    data.totalWithAutoMod > 0
      ? (data.autoResolved / data.totalWithAutoMod) * 100
      : null;

  return (
    <div className="space-y-4">
      <ProportionBar
        segments={segments}
        total={total}
        label={`Response pipeline, ${fmtCount(total)} total`}
      />
      <BreakdownList segments={segments} total={total} />

      <p className="text-[11px] text-muted-foreground">
        Flagged counts come from the automated check, which the Responses inbox
        can&apos;t filter by yet — review those under Pending review.
      </p>

      {autoModShare !== null && (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              Resolved without manual review
            </span>
            <span className="text-xs font-medium tabular-nums text-foreground">
              {fmtPercent(autoModShare, 0)}
            </span>
          </div>
          <Progress value={autoModShare} className="h-1" />
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {fmtCount(data.autoResolved)} of {fmtCount(data.totalWithAutoMod)}{" "}
            checked automatically
          </p>
        </div>
      )}

      <DefinitionList
        items={[
          {
            term: "Median time to approve",
            value: orDash(fmtHours(data.medianApprovalHours)),
          },
          {
            term: "Awaiting a decision",
            value: fmtCount(data.pending + data.flagged),
          },
        ]}
      />
    </div>
  );
}
