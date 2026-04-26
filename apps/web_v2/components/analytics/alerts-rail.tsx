"use client";

import Link from "next/link";
import { Warning, CheckCircle, ArrowUpRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { AlertEntry } from "@/lib/analytics/types";
import { timeAgo } from "@/lib/mock-data";

interface AlertsRailProps {
  alerts: AlertEntry[];
  projectSlug: string;
}

const ALERT_LABELS: Record<string, string> = {
  LOAD_TIME_EXCEEDED: "Slow load time",
  ERROR_RATE_EXCEEDED: "High error rate",
};

const SEVERITY_STYLES: Record<string, { color: string; bg: string }> = {
  HIGH: { color: "text-destructive", bg: "bg-destructive/8" },
  MEDIUM: { color: "text-warning", bg: "bg-warning/8" },
  LOW: { color: "text-muted-foreground", bg: "bg-muted/50" },
};

export function AlertsRail({ alerts, projectSlug }: AlertsRailProps) {
  const activeAlerts = alerts.filter((a) => !a.resolved);
  const resolvedAlerts = alerts.filter((a) => a.resolved).slice(0, 3);

  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle weight="fill" className="size-4 text-success" />
          <h3 className="text-sm font-semibold text-foreground">
            Performance alerts
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          No active alerts. All within threshold.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            {activeAlerts.length > 0 ? (
              <Warning
                weight="fill"
                className="size-3.5 text-warning shrink-0"
              />
            ) : (
              <CheckCircle
                weight="fill"
                className="size-3.5 text-success shrink-0"
              />
            )}
            <h3 className="text-sm font-semibold text-foreground">
              Performance alerts
            </h3>
            {activeAlerts.length > 0 && (
              <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                {activeAlerts.length} active
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 ml-5">
            Load time · errors
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {activeAlerts.map((alert) => {
          const styles = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.LOW;
          return (
            <Link
              key={alert.id}
              href={`/projects/${projectSlug}/widgets/${alert.widgetId}`}
              className={cn(
                "group flex items-start gap-3 rounded-md p-3 transition-colors duration-150",
                styles.bg,
                "hover:opacity-80",
              )}
            >
              <Warning
                weight="fill"
                className={cn("size-3.5 shrink-0 mt-0.5", styles.color)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      {alert.widgetName}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {ALERT_LABELS[alert.alertType] ?? alert.alertType} —{" "}
                      <span className="tabular-nums font-[var(--font-mono)]">
                        {alert.alertType === "LOAD_TIME_EXCEEDED"
                          ? `${alert.actualValue}ms`
                          : `${alert.actualValue} err/min`}
                      </span>{" "}
                      (threshold:{" "}
                      <span className="tabular-nums font-[var(--font-mono)]">
                        {alert.alertType === "LOAD_TIME_EXCEEDED"
                          ? `${alert.threshold}ms`
                          : `${alert.threshold}`}
                      </span>
                      )
                    </p>
                  </div>
                  <ArrowUpRight
                    weight="regular"
                    className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {timeAgo(alert.timestamp)}
                </p>
              </div>
            </Link>
          );
        })}

        {resolvedAlerts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Recently resolved
            </p>
            {resolvedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-2 py-1.5 opacity-60"
              >
                <CheckCircle
                  weight="fill"
                  className="size-3 shrink-0 text-success"
                />
                <span className="text-[11px] text-muted-foreground flex-1 truncate">
                  {alert.widgetName} — {ALERT_LABELS[alert.alertType]}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {timeAgo(alert.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
