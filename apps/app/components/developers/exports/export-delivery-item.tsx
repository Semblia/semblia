"use client";

/**
 * ExportDeliveryRow — one CSV export in the history list.
 *
 * What this row used to get wrong, all of it structural:
 *   • the status was a bespoke mono-uppercase chip rendering a lowercased enum
 *     ("ready", "failed"), which is a raw enum value with styling on it
 *   • SUCCEEDED-with-no-artifact rendered as "ready" with no download offered
 *     and no explanation — the user saw a finished export they could not take
 *   • `fmtRelative` with no precise value behind it, so "3d ago" had no
 *     underlying timestamp anywhere on screen
 *
 * Now: one `StatusBadge` from the delivery registry, `timeAgo` with
 * `fmtDateTime` in the title, and a download control that is either enabled or
 * disabled *with its reason in place* — never offered against a 409.
 */

import * as React from "react";
import { FileCsvIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import type { V2ExportDeliveryDTO } from "@workspace/types";
import { Spinner } from "@/components/ui/spinner";
import {
  ItemRow,
  ItemActionRow,
  StatusBadge,
  type ItemAction,
} from "@/components/shared";
import { humanizeLabel, timeAgo, fmtDateTime, fmtCount } from "@/lib/format";
import { exportDeliveryView } from "./delivery-status";

/**
 * The filename the API recorded, or a stable derived one. Never blank: a row
 * whose title is empty reads as a broken record rather than an untitled file.
 */
function deliveryFilename(delivery: V2ExportDeliveryDTO): string {
  const fromPayload = delivery.payload?.filename;
  if (typeof fromPayload === "string" && fromPayload.trim()) {
    return fromPayload.trim();
  }
  return `responses-export-${delivery.id.slice(0, 8)}.csv`;
}

export const ExportDeliveryRow = React.memo(function ExportDeliveryRow({
  delivery,
  onDownload,
  isDownloading,
}: {
  delivery: V2ExportDeliveryDTO;
  onDownload: (deliveryId: string) => void;
  isDownloading: boolean;
}) {
  const view = exportDeliveryView(delivery);
  const filename = deliveryFilename(delivery);
  // The moment the record is *about*: when it finished, else when it started.
  const stamp = delivery.completedAt ?? delivery.createdAt;

  const actions: ItemAction[] = view.downloadable
    ? [
        {
          id: "download",
          label: isDownloading ? "Preparing…" : "Download CSV",
          icon: isDownloading ? undefined : DownloadSimpleIcon,
          pinned: true,
          disabled: isDownloading,
          onSelect: () => onDownload(delivery.id),
        },
      ]
    : [];

  return (
    <ItemRow
      role="listitem"
      padding="default"
      aria-label={filename}
      leading={
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/30">
          <FileCsvIcon
            className="size-4 text-muted-foreground"
            weight="regular"
            aria-hidden
          />
        </span>
      }
      title={
        <span className="truncate font-mono text-[13px] text-foreground">
          {filename}
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>{humanizeLabel(delivery.eventType)}</span>
          <span aria-hidden>·</span>
          {/* One time formatter, with the exact value one hover away. */}
          <span className="tabular-nums" title={fmtDateTime(stamp)}>
            {timeAgo(stamp)}
          </span>
          {/* A single attempt is the normal case and not worth a word; more
              than one is the story of a retry and is. A real 0 never occurs
              here, so this reads as "extra information", not a hidden zero. */}
          {delivery.attempts > 1 && (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums">
                {fmtCount(delivery.attempts)} attempts
              </span>
            </>
          )}
        </span>
      }
      trailing={<StatusBadge label={view.meta.label} tone={view.meta.tone} />}
      actions={
        actions.length > 0 || view.blockedReason || delivery.error ? (
          <ItemActionRow
            actions={actions}
            leading={
              <DeliveryNote
                blockedReason={view.blockedReason}
                error={delivery.error}
                isDownloading={isDownloading}
              />
            }
          />
        ) : undefined
      }
    />
  );
});

/**
 * The reason line under a delivery. A failed export's own error is the most
 * specific truth available, so it wins; the generic "what to do now" sentence
 * only fills in when the API gave no message.
 */
function DeliveryNote({
  blockedReason,
  error,
  isDownloading,
}: {
  blockedReason: string | null;
  error: string | null;
  isDownloading: boolean;
}) {
  if (error) {
    return (
      <span className="min-w-0 flex-1 truncate text-[11px] text-destructive">
        {error}
      </span>
    );
  }
  if (blockedReason) {
    return (
      <span className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-foreground">
        {blockedReason}
      </span>
    );
  }
  if (isDownloading) {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Spinner className="size-3" />
        Preparing the file…
      </span>
    );
  }
  return null;
}
