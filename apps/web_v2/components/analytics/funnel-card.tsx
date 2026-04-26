"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { FunnelData } from "@/lib/analytics/types";

interface FunnelCardProps {
  data: FunnelData;
  projectSlug: string;
}

export function FunnelCard({ data, projectSlug }: FunnelCardProps) {
  const { steps } = data;
  const max = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Collection funnel
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Funnel conversion
        </p>
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => {
          const prevStep = steps[i - 1];
          const conversionRate =
            prevStep && prevStep.value > 0
              ? ((step.value / prevStep.value) * 100).toFixed(0)
              : null;
          const barWidth = max > 0 ? (step.value / max) * 100 : 0;

          const href = step.href.startsWith("?")
            ? step.href
            : `/projects/${projectSlug}/${step.href}`;

          return (
            <div key={step.label}>
              {conversionRate !== null && (
                <div className="flex items-center gap-2 py-0.5 pl-3">
                  <div className="h-3 w-px bg-border" />
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {conversionRate}% conversion
                  </span>
                </div>
              )}
              <Link
                href={href}
                className={cn(
                  "group flex items-center gap-3 rounded-md p-2.5 -mx-1",
                  "transition-[colors,transform] duration-150 hover:bg-accent/50 active:scale-[0.99]",
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <span className="text-xs font-medium text-foreground">
                      {step.label}
                    </span>
                    <span className="text-xs font-semibold text-foreground tabular-nums font-mono shrink-0">
                      {step.value.toLocaleString("en-US")}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
                <ArrowRight
                  weight="regular"
                  className="size-3.5 shrink-0 text-muted-foreground opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0"
                />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
