"use client";

import { cn } from "@/lib/utils";
import type { CountryEntry } from "@/lib/analytics/types";

interface TopCountriesBarProps {
  countries: CountryEntry[];
}

export function TopCountriesBar({ countries }: TopCountriesBarProps) {
  const maxImpressions = Math.max(...countries.map((c) => c.impressions), 1);
  const totalImpressions = countries.reduce((s, c) => s + c.impressions, 0);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Top countries</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          By widget impressions
        </p>
      </div>

      {countries.length === 0 ? (
        <p className="text-xs text-muted-foreground">No impression data yet.</p>
      ) : (
        <div className="space-y-2">
          {countries.slice(0, 8).map((c, i) => {
            const barWidth = (c.impressions / maxImpressions) * 100;
            const pct =
              totalImpressions > 0
                ? ((c.impressions / totalImpressions) * 100).toFixed(1)
                : "0";

            return (
              <div
                key={c.countryCode}
                className={cn(
                  "flex items-center gap-2.5 py-1.5",
                  i < countries.length - 1 && "border-b border-border/40",
                )}
              >
                <span className="text-xs font-medium text-muted-foreground w-4 shrink-0 tabular-nums">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs font-medium text-foreground truncate">
                      {c.countryName}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {pct}%
                      </span>
                      <span className="text-xs font-semibold tabular-nums font-[var(--font-mono)] text-foreground">
                        {c.impressions.toLocaleString("en-US")}
                      </span>
                    </div>
                  </div>
                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand/70 transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
