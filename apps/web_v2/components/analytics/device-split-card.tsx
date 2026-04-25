"use client";

import { DeviceMobile, Monitor, DeviceTablet } from "@phosphor-icons/react";
import type { DeviceSplit } from "@/lib/analytics/types";

interface DeviceSplitCardProps {
  data: DeviceSplit;
}

export function DeviceSplitCard({ data }: DeviceSplitCardProps) {
  const total = data.mobile + data.tablet + data.desktop;
  const segments = [
    {
      label: "Mobile",
      value: data.mobile,
      pct: total > 0 ? Math.round((data.mobile / total) * 100) : 0,
      color: "var(--color-brand)",
      Icon: DeviceMobile,
    },
    {
      label: "Desktop",
      value: data.desktop,
      pct: total > 0 ? Math.round((data.desktop / total) * 100) : 0,
      color: "var(--color-chart-3)",
      Icon: Monitor,
    },
    {
      label: "Tablet",
      value: data.tablet,
      pct: total > 0 ? Math.round((data.tablet / total) * 100) : 0,
      color: "var(--color-muted-foreground)",
      Icon: DeviceTablet,
    },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Device split</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          By device
        </p>
      </div>

      {/* Stacked bar */}
      <div className="flex h-2 w-full rounded-full overflow-hidden gap-px mb-4">
        {segments.map((s) => (
          <div
            key={s.label}
            className="h-full transition-all duration-500"
            style={{ width: `${s.pct}%`, background: s.color }}
          />
        ))}
      </div>

      <div className="space-y-2">
        {segments.map((s) => {
          const { Icon } = s;
          return (
            <div key={s.label} className="flex items-center gap-2.5">
              <div
                className="size-2 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              <Icon weight="regular" className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-xs text-muted-foreground">
                {s.label}
              </span>
              <span className="text-xs font-semibold tabular-nums font-[var(--font-mono)] text-foreground">
                {s.pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
