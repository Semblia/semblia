"use client";

import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export interface RefreshingDataBadgeProps {
  show?: boolean;
  label?: string;
  className?: string;
}

export function RefreshingDataBadge({
  show,
  label = "Refreshing data",
  className,
}: RefreshingDataBadgeProps) {
  if (!show) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-background/95 px-2.5 text-[10px] font-medium text-muted-foreground shadow-sm",
        className,
      )}
    >
      <Spinner className="size-3 text-brand" aria-hidden />
      {label}
    </span>
  );
}
