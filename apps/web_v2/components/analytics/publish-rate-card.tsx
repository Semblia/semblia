"use client";

import type { PublishRateData } from "@/lib/analytics/types";

interface PublishRateCardProps {
  data: PublishRateData;
}

export function PublishRateCard({ data }: PublishRateCardProps) {
  const rate = Math.round(data.publishRate);
  const autoShare = Math.round(data.autoPublishedShare);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Publish rate</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          From approved pool
        </p>
      </div>

      {/* Gauge */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative" style={{ width: 88, height: 52 }}>
          <svg width={88} height={52} viewBox="0 0 88 52" overflow="visible">
            {/* Track */}
            <path
              d="M 8 44 A 36 36 0 0 1 80 44"
              fill="none"
              stroke="var(--color-muted)"
              strokeWidth={6}
              strokeLinecap="round"
            />
            {/* Fill */}
            <path
              d="M 8 44 A 36 36 0 0 1 80 44"
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={`${(rate / 100) * (Math.PI * 36)} ${Math.PI * 36}`}
              style={{ transition: "stroke-dasharray 600ms cubic-bezier(0.16,1,0.3,1)" }}
            />
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-0.5">
            <span className="text-xl font-semibold tabular-nums font-[var(--font-mono)] text-foreground leading-none">
              {rate}%
            </span>
          </div>
        </div>

        <div className="w-full space-y-1.5 mt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Published</span>
            <span className="tabular-nums font-[var(--font-mono)] font-semibold text-foreground">
              {data.totalPublished}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Approved pool</span>
            <span className="tabular-nums font-[var(--font-mono)] font-semibold text-foreground">
              {data.totalApproved}
            </span>
          </div>
        </div>
      </div>

      {/* Auto-published share */}
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground">Auto-published</span>
          <span className="text-xs font-semibold tabular-nums font-[var(--font-mono)] text-foreground">
            {autoShare}%
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-success/70 transition-all duration-500"
            style={{ width: `${autoShare}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Auto-published share
        </p>
      </div>
    </div>
  );
}
