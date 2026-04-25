"use client";

import Link from "next/link";
import { ArrowUpRight, Key } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";
import { Progress } from "@/components/ui/progress";
import type { ApiKeyUsageData } from "@/lib/analytics/types";
import { timeAgo } from "@/lib/mock-data";

interface ApiUsageCardProps {
  keys: ApiKeyUsageData[];
}

export function ApiUsageCard({ keys }: ApiUsageCardProps) {
  if (keys.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-2">API usage</h3>
        <p className="text-xs text-muted-foreground">
          No API keys configured.{" "}
          <Link
            href="/account/api-keys"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Manage keys
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">API usage</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Requests by key
          </p>
        </div>
        <Link
          href="/account/api-keys"
          className="flex items-center gap-0.5 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
        >
          Manage
          <ArrowUpRight weight="regular" className="size-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {keys.map((key) => {
          const usagePct =
            key.usageLimit !== null && key.usageLimit > 0
              ? Math.min((key.usageCount / key.usageLimit) * 100, 100)
              : null;
          const isHighUsage = usagePct !== null && usagePct > 80;

          return (
            <div
              key={key.keyId}
              className={cn(
                "rounded-lg border bg-card p-4",
                isHighUsage ? "border-warning/30" : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Key
                      weight="regular"
                      className="size-3 shrink-0 text-muted-foreground"
                    />
                    <p className="text-xs font-semibold text-foreground truncate">
                      {key.keyName}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-[var(--font-mono)] mt-0.5">
                    {key.keyPrefix}…
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    key.isActive
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {key.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mb-2">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">
                    Requests
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-semibold tabular-nums font-[var(--font-mono)] text-foreground">
                      {key.usageCount.toLocaleString("en-US")}
                    </span>
                    {key.usageLimit !== null && (
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        / {key.usageLimit.toLocaleString("en-US")}
                      </span>
                    )}
                  </div>
                </div>
                {usagePct !== null && (
                  <Progress
                    value={usagePct}
                    className={cn(
                      "h-1",
                      isHighUsage ? "[&>div]:bg-warning" : "[&>div]:bg-brand",
                    )}
                  />
                )}
              </div>

              <Sparkline
                series={key.series}
                color={
                  isHighUsage
                    ? "var(--color-warning)"
                    : "var(--color-brand)"
                }
                height={24}
              />

              {key.lastUsedAt && (
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Last used {timeAgo(key.lastUsedAt)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
