"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { fmtRelative } from "@/lib/format";
import type { V2OutboundWebhookDeliveryDTO } from "@workspace/types";
import { ArrowsClockwiseIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ItemRow, ItemActionRow, type ItemAction } from "@/components/shared";
import { DeliveryStatusChip } from "@/components/developers/exports/export-delivery-item";
import { humanizeWebhookEvent } from "./webhook-events";

/* ─── Row skeleton ────────────────────────────────────────────────────────── */

export function WebhookDeliveryRowSkeleton() {
  return (
    <ItemRow
      padding="default"
      title={<Skeleton className="h-3.5 w-44 animate-shimmer" />}
      subtitle={<Skeleton className="h-3 w-32 animate-shimmer" />}
      trailing={<Skeleton className="h-5 w-16 rounded-md animate-shimmer" />}
    />
  );
}

/* ─── Row ─────────────────────────────────────────────────────────────────── */

export const WebhookDeliveryRow = React.memo(function WebhookDeliveryRow({
  delivery,
  onRetry,
  isRetrying,
}: {
  delivery: V2OutboundWebhookDeliveryDTO;
  onRetry: (deliveryId: string) => void;
  isRetrying: boolean;
}) {
  const isFailed =
    delivery.status === "FAILED" || delivery.status === "EXHAUSTED";
  const canRetry = isFailed;

  const actions: ItemAction[] = canRetry
    ? [
        {
          id: "retry",
          label: isRetrying ? "Retrying…" : "Retry",
          icon: isRetrying ? undefined : ArrowsClockwiseIcon,
          tone: "warning",
          pinned: true,
          disabled: isRetrying,
          onSelect: () => onRetry(delivery.id),
        },
      ]
    : [];

  return (
    <ItemRow
      padding="default"
      title={
        <span className="truncate font-mono text-[13px] text-foreground">
          {humanizeWebhookEvent(delivery.eventType)}
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>{fmtRelative(new Date(delivery.createdAt))}</span>
          {delivery.attempts > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>
                {delivery.attempts}{" "}
                {delivery.attempts === 1 ? "attempt" : "attempts"}
              </span>
            </>
          )}
          {delivery.responseStatus != null && (
            <>
              <span aria-hidden>·</span>
              <span
                className={cn(
                  "font-mono",
                  delivery.responseStatus >= 400 && "text-destructive",
                )}
              >
                HTTP {delivery.responseStatus}
              </span>
            </>
          )}
          {delivery.nextAttemptAt && !isFailed && (
            <>
              <span aria-hidden>·</span>
              <span>Next {fmtRelative(new Date(delivery.nextAttemptAt))}</span>
            </>
          )}
        </span>
      }
      trailing={<DeliveryStatusChip status={delivery.status} />}
      actions={
        canRetry || delivery.error ? (
          <ItemActionRow
            actions={actions}
            leading={
              delivery.error ? (
                <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-destructive">
                  <WarningCircleIcon
                    className="size-3.5 shrink-0"
                    weight="fill"
                    aria-hidden
                  />
                  <span className="truncate">{delivery.error}</span>
                </span>
              ) : isRetrying ? (
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
