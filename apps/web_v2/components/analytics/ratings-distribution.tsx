"use client";

/**
 * RatingsDistribution — how the stars fall across the scale.
 *
 * This was the best-behaved panel in the directory and is kept as the reference
 * for one thing: it always renders all five buckets, so a genuinely empty
 * bucket reads "0 (0%)" instead of disappearing. Two defects go with it — the
 * headline rendered the API's unbounded float verbatim (`4.333333333333333`),
 * and the average carried no scale, so `4` was unreadable without knowing
 * whether the scale was 5 or 10.
 *
 * The colour ramp is gone too: painting ≥4 stars green and ≤2 red encoded an
 * editorial judgement into a neutral distribution with nothing explaining it.
 */

import { Star } from "@phosphor-icons/react";
import { DefinitionList } from "@/components/shared";
import { Progress } from "@/components/ui/progress";
import { ABSENT, fmtCount, fmtRating } from "@/lib/format";
import { fmtPercent } from "@/lib/analytics/range";
import { RATING_SCALE, type RatingsData } from "@/lib/analytics/types";

const BUCKETS = Array.from(
  { length: RATING_SCALE },
  (_, i) => RATING_SCALE - i,
);

export function RatingsDistribution({ data }: { data: RatingsData }) {
  const maxCount = Math.max(...Object.values(data.distribution), 1);
  const average =
    data.average === null
      ? null
      : fmtRating(Number(data.average.toFixed(1)), RATING_SCALE);

  return (
    <div className="space-y-4">
      <DefinitionList
        items={[
          {
            term: "Average rating",
            value: (
              <span className="inline-flex items-center gap-1">
                <Star className="size-3 text-brand" weight="fill" aria-hidden />
                {average ?? ABSENT}
              </span>
            ),
          },
          { term: "Responses rated", value: fmtCount(data.total) },
        ]}
      />

      <ul className="space-y-2">
        {BUCKETS.map((rating) => {
          const count = data.distribution[rating] ?? 0;
          const share = data.total > 0 ? (count / data.total) * 100 : 0;

          return (
            <li key={rating} className="flex items-center gap-3">
              <span className="flex w-10 shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                {rating}
                <Star
                  className="size-2.5 shrink-0 text-brand/60"
                  weight="fill"
                  aria-hidden
                />
                <span className="sr-only">
                  {rating} of {RATING_SCALE}
                </span>
              </span>
              <Progress
                value={(count / maxCount) * 100}
                className="h-1.5 flex-1"
              />
              <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums text-foreground">
                {fmtCount(count)}
              </span>
              <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {fmtPercent(share, 0)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
