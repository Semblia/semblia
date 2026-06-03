"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import Link from "next/link";
import type { PipelineData } from "@/lib/analytics/types";

interface PipelineCardProps {
  data: PipelineData;
  projectSlug: string;
}

interface PipelineSegment {
  key: string;
  label: string;
  value: number;
  color: string;
  href: string;
}

export function PipelineCard({ data, projectSlug }: PipelineCardProps) {
  const total = data.pending + data.approved + data.rejected + data.flagged;
  const autoModPct =
    total > 0 ? Math.round((data.autoResolved / total) * 100) : 0;

  const segments: PipelineSegment[] = [
    {
      key: "approved",
      label: "Approved",
      value: data.approved,
      color: "var(--color-success)",
      href: `/projects/${projectSlug}/responses?status=approved`,
    },
    {
      key: "pending",
      label: "Pending",
      value: data.pending,
      color: "var(--color-brand)",
      href: `/projects/${projectSlug}/responses?status=pending`,
    },
    {
      key: "flagged",
      label: "Flagged",
      value: data.flagged,
      color: "var(--color-warning)",
      href: `/projects/${projectSlug}/responses?status=flagged`,
    },
    {
      key: "rejected",
      label: "Rejected",
      value: data.rejected,
      color: "var(--color-destructive)",
      href: `/projects/${projectSlug}/responses?status=rejected`,
    },
  ].filter((s) => s.value > 0);

  const chartData = segments.map((s) => ({
    name: s.label,
    value: s.value,
    color: s.color,
  }));

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Approval pipeline
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">By status</p>
      </div>

      <div className="flex items-start gap-4">
        {/* Donut */}
        <div className="shrink-0" style={{ width: 80, height: 80 }}>
          {total > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={28}
                  outerRadius={38}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "6px",
                    fontSize: 12,
                    color: "var(--color-foreground)",
                    padding: "4px 8px",
                  }}
                  formatter={(v, name) =>
                    [`${v}`, `${name}`] as [string, string]
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex size-20 items-center justify-center rounded-full border-2 border-dashed border-border">
              <span className="text-[10px] text-muted-foreground">No data</span>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {segments.map((seg) => {
            const pct =
              total > 0 ? ((seg.value / total) * 100).toFixed(0) : "0";
            return (
              <Link
                key={seg.key}
                href={seg.href}
                className="group flex items-center gap-2 rounded px-1.5 py-1 -mx-1.5 transition-colors hover:bg-accent/50"
              >
                <div
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: seg.color }}
                />
                <span className="flex-1 min-w-0 text-xs text-muted-foreground truncate">
                  {seg.label}
                </span>
                <span className="text-xs font-semibold text-foreground tabular-nums font-mono">
                  {seg.value}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums w-7 text-right">
                  {pct}%
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Auto-mod efficacy */}
      {data.totalWithAutoMod > 0 && (
        <div className="mt-4 rounded-md bg-muted/50 px-3 py-2.5 border border-border/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Auto-moderation
            </span>
            <span className="text-xs font-semibold text-foreground tabular-nums font-mono">
              {autoModPct}%
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-success transition-all duration-500"
              style={{ width: `${autoModPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {data.autoResolved} of {data.totalWithAutoMod} resolved without
            manual review
          </p>
        </div>
      )}

      {/* Median approval time */}
      {data.medianApprovalHours !== null && (
        <div className="mt-3 flex items-center justify-between px-0.5">
          <span className="text-[11px] text-muted-foreground">
            Median time to approve
          </span>
          <span className="text-xs font-semibold tabular-nums font-mono text-foreground">
            {data.medianApprovalHours < 1
              ? `${Math.round(data.medianApprovalHours * 60)}m`
              : `${data.medianApprovalHours.toFixed(1)}h`}
          </span>
        </div>
      )}
    </div>
  );
}
