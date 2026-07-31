"use client";

/**
 * FunnelSteps — impressions → submissions → approved, and what falls out between.
 *
 * Two things were dishonest here. A step whose predecessor had no traffic had
 * no conversion rate, and the row for it was removed entirely — so "there was
 * nothing to convert from" and "we didn't compute this" both rendered as a gap,
 * and the funnel visually lost its spine. And `toFixed(0)` turned 0.4% into
 * "0% conversion", which reads as total failure rather than as rounding.
 *
 * Rates now render at one fixed precision, an unknowable rate renders as an em
 * dash with the connector still drawn, and every step leads to its own rows.
 */

import Link from "next/link";
import { CaretDown } from "@phosphor-icons/react";
import { Progress } from "@/components/ui/progress";
import { fmtCount, ABSENT } from "@/lib/format";
import { fmtPercent } from "@/lib/analytics/range";
import { formsPath, responsesPath } from "@/lib/routes";
import type { FunnelData } from "@/lib/analytics/types";

interface FunnelStepsProps {
  data: FunnelData;
  projectSlug: string;
}

/**
 * Each step's destination is the rows it counts. Previously the first step
 * switched an analytics tab while the rest navigated out of Analytics, behind
 * identical-looking rows with the same hover arrow.
 */
function destinationFor(key: string, slug: string): string {
  switch (key) {
    case "form_impressions":
      return formsPath(slug);
    case "approved":
      return `${responsesPath(slug)}?status=approved`;
    default:
      return `${responsesPath(slug)}?status=all`;
  }
}

export function FunnelSteps({ data, projectSlug }: FunnelStepsProps) {
  const { steps } = data;
  const top = steps[0]?.value ?? 0;

  return (
    <ol className="space-y-1">
      {steps.map((step, i) => {
        const previous = steps[i - 1];
        // A rate needs a denominator. Without one the row still renders, saying
        // plainly that the number does not exist rather than vanishing.
        const rate =
          previous === undefined
            ? null
            : previous.value > 0
              ? fmtPercent((step.value / previous.value) * 100)
              : ABSENT;
        const width = top > 0 ? (step.value / top) * 100 : 0;

        return (
          <li key={step.key}>
            {previous !== undefined && (
              <div className="flex items-center gap-1.5 py-1 pl-2 text-[11px] text-muted-foreground">
                <CaretDown
                  className="size-3 shrink-0"
                  weight="bold"
                  aria-hidden
                />
                <span className="tabular-nums">
                  {/* "— of form impressions" reads as a broken string. When the
                      step above it is zero there is no ratio to state, so say
                      that instead of dashing the number and keeping the rest of
                      the sentence. */}
                  {rate === ABSENT
                    ? `No ${previous.label.toLowerCase()} to convert from`
                    : `${rate} of ${previous.label.toLowerCase()}`}
                </span>
              </div>
            )}

            <Link
              href={destinationFor(step.key, projectSlug)}
              className="-mx-2 block rounded-md px-2 py-2 transition-colors duration-(--duration-base) hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="min-w-0 text-xs font-medium text-foreground">
                  {step.label}
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                  {fmtCount(step.value)}
                </span>
              </div>
              <Progress value={width} tone="brand" className="h-1.5" />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
