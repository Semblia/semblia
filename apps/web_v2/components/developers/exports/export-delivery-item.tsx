"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { fmtRelative, humanizeLabel } from "@/lib/format";
import type { V2DeliveryStatus, V2ExportDeliveryDTO } from "@workspace/types";
import {
  FileCsvIcon,
  DownloadSimpleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ItemRow, ItemActionRow, type ItemAction } from "@/components/shared";

/* ─── Status chip ─────────────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<
  V2DeliveryStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "queued",
    className: "border-border bg-muted/60 text-muted-foreground",
  },
  DELIVERING: {
    label: "running",
    className: "border-brand/30 bg-brand-muted text-brand-foreground",
  },
  SUCCEEDED: {
    label: "ready",
    className: "border-success/30 bg-success/10 text-success",
  },
  FAILED: {
    label: "failed",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  EXHAUSTED: {
    label: "failed",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

export function DeliveryStatusChip({ status }: { status: V2DeliveryStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em]",
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function deliveryFilename(delivery: V2ExportDeliveryDTO): string {
  const fromPayload = delivery.payload?.filename;
  if (typeof fromPayload === "string" && fromPayload.trim()) {
    return fromPayload;
  }
  return `responses-export-${delivery.id.slice(0, 8)}.csv`;
}

function humanizeEvent(eventType: string): string {
  return humanizeLabel(eventType);
}

/* ─── Row skeleton ────────────────────────────────────────────────────────── */

export function ExportDeliveryRowSkeleton() {
  return (
    <ItemRow
      padding="default"
      leading={<Skeleton className="size-8 rounded-lg animate-shimmer" />}
      title={<Skeleton className="h-3.5 w-44 animate-shimmer" />}
      subtitle={<Skeleton className="h-3 w-32 animate-shimmer" />}
      trailing={<Skeleton className="h-5 w-14 rounded-md animate-shimmer" />}
    />
  );
}

/* ─── Row ─────────────────────────────────────────────────────────────────── */

export const ExportDeliveryRow = React.memo(function ExportDeliveryRow({
  delivery,
  onDownload,
  isDownloading,
}: {
  delivery: V2ExportDeliveryDTO;
  onDownload: (deliveryId: string) => void;
  isDownloading: boolean;
}) {
  const isReady =
    delivery.status === "SUCCEEDED" && delivery.artifactAssetId != null;
  const isFailed =
    delivery.status === "FAILED" || delivery.status === "EXHAUSTED";

  const createdLabel = fmtRelative(new Date(delivery.createdAt));
  const filename = deliveryFilename(delivery);

  const actions: ItemAction[] = isReady
    ? [
        {
          id: "download",
          label: isDownloading ? "Preparing…" : "Download CSV",
          icon: isDownloading ? undefined : DownloadSimpleIcon,
          tone: "neutral",
          pinned: true,
          disabled: isDownloading,
          onSelect: () => onDownload(delivery.id),
        },
      ]
    : [];

  return (
    <ItemRow
      padding="default"
      leading={
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/30">
          <FileCsvIcon
            className="size-4 text-muted-foreground"
            weight="regular"
            aria-hidden
          />
        </div>
      }
      title={
        <span className="truncate font-mono text-[13px] text-foreground">
          {filename}
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>{humanizeEvent(delivery.eventType)}</span>
          <span aria-hidden>·</span>
          <span>Created {createdLabel}</span>
          {delivery.attempts > 1 && (
            <>
              <span aria-hidden>·</span>
              <span>{delivery.attempts} attempts</span>
            </>
          )}
        </span>
      }
      trailing={<DeliveryStatusChip status={delivery.status} />}
      actions={
        isReady || (isFailed && delivery.error) ? (
          <ItemActionRow
            actions={actions}
            leading={
              isFailed && delivery.error ? (
                <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-destructive">
                  <WarningCircleIcon
                    className="size-3.5 shrink-0"
                    weight="fill"
                    aria-hidden
                  />
                  <span className="truncate">{delivery.error}</span>
                </span>
              ) : isDownloading ? (
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Spinner className="size-3" />
                </span>
              ) : null
            }
          />
        ) : undefined
      }
    />
  );
});
