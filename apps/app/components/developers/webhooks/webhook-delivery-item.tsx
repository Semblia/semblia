"use client";

/**
 * WebhookDeliveryRow — one attempt to deliver one event.
 *
 * The comparable facts down a delivery list are status, attempt count, and
 * timing, so they sit in the row's `metrics` slot with `tabular-nums` and a
 * fixed order rather than being interleaved with prose. (A real `DataTable`
 * would align them exactly; see the note in `webhooks-client.tsx` for why the
 * list form is used here.)
 *
 * The retry control is the P6 case on this surface. The API accepts a retry for
 * FAILED and EXHAUSTED only, and then refuses to process it at all when the
 * endpoint is no longer ACTIVE — so a revoked endpoint's failed delivery gets a
 * disabled control with the reason stated in place, not an enabled button that
 * queues work which will be dropped.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { V2OutboundWebhookDeliveryDTO } from "@workspace/types";
import { ArrowsClockwiseIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Spinner } from "@/components/ui/spinner";
import {
  ItemRow,
  ItemActionRow,
  StatusBadge,
  type ItemAction,
} from "@/components/shared";
import { timeAgo, fmtDateTime, fmtCount } from "@/lib/format";
import {
  webhookDeliveryMeta,
  webhookRetryState,
} from "@/components/developers/exports/delivery-status";
import { humanizeWebhookEvent } from "./webhook-events";

export const WebhookDeliveryRow = React.memo(function WebhookDeliveryRow({
  delivery,
  endpointActive,
  onRetry,
  isRetrying,
}: {
  delivery: V2OutboundWebhookDeliveryDTO;
  /**
   * Whether the endpoint this delivery belongs to is still ACTIVE. `null` when
   * the endpoint list hasn't resolved — unknown is not the same as inactive,
   * so the control is left enabled rather than blocked on a guess.
   */
  endpointActive: boolean | null;
  onRetry: (deliveryId: string) => void;
  isRetrying: boolean;
}) {
  const meta = webhookDeliveryMeta(delivery.status);
  const { retryable, blockedReason } = webhookRetryState(
    delivery.status,
    endpointActive,
  );

  const actions: ItemAction[] = retryable
    ? [
        {
          id: "retry",
          label: isRetrying ? "Retrying…" : "Retry delivery",
          icon: isRetrying ? undefined : ArrowsClockwiseIcon,
          tone: "warning",
          pinned: true,
          disabled: isRetrying || blockedReason !== null,
          disabledReason: blockedReason ?? undefined,
          onSelect: () => onRetry(delivery.id),
        },
      ]
    : [];

  return (
    <ItemRow
      role="listitem"
      padding="default"
      aria-label={`${humanizeWebhookEvent(delivery.eventType)} delivery`}
      title={
        <span className="truncate text-[13px] font-medium text-foreground">
          {humanizeWebhookEvent(delivery.eventType)}
        </span>
      }
      subtitle={
        <span className="block truncate font-mono text-[11px] text-muted-foreground">
          {delivery.eventType}
        </span>
      }
      metrics={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] tabular-nums text-muted-foreground">
          <span title={fmtDateTime(delivery.createdAt)}>
            {timeAgo(delivery.createdAt)}
          </span>
          <span aria-hidden className="text-border">
            ·
          </span>
          {/* A real 0 is shown as 0: "queued, never attempted" is a fact. */}
          <span>
            {fmtCount(delivery.attempts)}{" "}
            {delivery.attempts === 1 ? "attempt" : "attempts"}
          </span>
          {delivery.responseStatus != null && (
            <>
              <span aria-hidden className="text-border">
                ·
              </span>
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
          {delivery.nextAttemptAt && meta.transitional && (
            <>
              <span aria-hidden className="text-border">
                ·
              </span>
              <span title={fmtDateTime(delivery.nextAttemptAt)}>
                Next {timeAgo(delivery.nextAttemptAt)}
              </span>
            </>
          )}
        </span>
      }
      trailing={<StatusBadge label={meta.label} tone={meta.tone} />}
      actions={
        actions.length > 0 || delivery.error ? (
          <ItemActionRow
            actions={actions}
            leading={
              delivery.error ? (
                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] text-destructive">
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
                  Re-queueing…
                </span>
              ) : null
            }
          />
        ) : undefined
      }
    />
  );
});
