"use client";

import * as React from "react";
import { ChatText as MessageSquareTextIcon } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ── Empty state ───────────────────────────────────────────────────────────────

export function DetailEmpty() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-muted">
        <MessageSquareTextIcon className="size-4 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">
        No response selected
      </p>
      <p className="mt-1 max-w-[200px] text-xs leading-relaxed text-muted-foreground">
        Select a response from the list to view its details.
      </p>
    </div>
  );
}

// ── Loading skeleton (body only — header renders separately) ───────────────

export function DetailBodySkeleton({ isPage }: { isPage: boolean }) {
  return (
    <div className={cn("flex-1 space-y-6", isPage ? "px-6 py-6" : "px-5 py-5")}>
      {/* Author */}
      <div className="flex items-start gap-3">
        <Skeleton className="size-10 rounded-full animate-shimmer" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-28 animate-shimmer" />
          <Skeleton className="h-3 w-20 animate-shimmer" />
        </div>
      </div>
      {/* Content */}
      <div className="space-y-2 pl-3 border-l-2 border-border">
        <Skeleton className="h-3 w-full animate-shimmer" />
        <Skeleton className="h-3 w-5/6 animate-shimmer" />
        <Skeleton className="h-3 w-3/5 animate-shimmer" />
      </div>
      {/* Status pills */}
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full animate-shimmer" />
        <Skeleton className="h-6 w-24 rounded-full animate-shimmer" />
      </div>
    </div>
  );
}

// ── Metadata row helper ───────────────────────────────────────────────────────

export function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Icon className="size-3.5 shrink-0 text-muted-foreground/60" />
      <span className="w-16 shrink-0 text-[11px] text-muted-foreground">
        {label}
      </span>
      <span className="text-[11px] font-medium text-foreground">{value}</span>
    </div>
  );
}
