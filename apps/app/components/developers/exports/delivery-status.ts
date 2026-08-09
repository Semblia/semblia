/**
 * Delivery lifecycles — the one status vocabulary the delivery surfaces share.
 *
 * `V2DeliveryStatus` is the same enum behind CSV exports and outbound webhook
 * deliveries, but the *fact* each value states is different: a webhook that
 * SUCCEEDED was delivered; an export that SUCCEEDED produced a file that may or
 * may not still be downloadable. So there are two registries over one enum, not
 * one shared label map, and each one ends with a fallback because the API can
 * grow an enum value before the web app knows it.
 *
 * Each registry also answers the P6 question — "may the user act on this?" —
 * beside the label, so no call site has to re-derive it and get it wrong. A
 * download the API will refuse with a 409 is never offered as an enabled button.
 *
 * These live here rather than in `components/shared/status-badge.tsx` alongside
 * `reviewStatusMeta` / `importJobMeta` only because that file is owned by the
 * primitive layer. They deliberately mirror its shape (`StatusMeta` + a
 * `transitional` flag) so hoisting them later is a move, not a rewrite.
 */

import type { V2DeliveryStatus, V2ExportDeliveryDTO } from "@workspace/types";
import type { StatusMeta } from "@/components/shared";
import { humanizeLabel } from "@/lib/format";

/** A status that also knows whether it is still moving. */
export interface LifecycleMeta extends StatusMeta {
  /** True only while the state is genuinely in flight — the only case that animates. */
  transitional: boolean;
}

function fallback(value: string): LifecycleMeta {
  return {
    label: humanizeLabel(value.toLowerCase()),
    tone: "neutral",
    transitional: false,
  };
}

// ── Outbound webhook deliveries ──────────────────────────────────────────────

const WEBHOOK_DELIVERY: Record<V2DeliveryStatus, LifecycleMeta> = {
  PENDING: { label: "Queued", tone: "progress", transitional: true },
  DELIVERING: { label: "Sending", tone: "progress", transitional: true },
  SUCCEEDED: { label: "Delivered", tone: "positive", transitional: false },
  FAILED: { label: "Failed", tone: "critical", transitional: false },
  // Distinct from FAILED: the queue has stopped trying on its own. Collapsing
  // the two would hide the fact that nothing further will happen unattended.
  EXHAUSTED: {
    label: "Retries exhausted",
    tone: "critical",
    transitional: false,
  },
};

export function webhookDeliveryMeta(value: string): LifecycleMeta {
  return WEBHOOK_DELIVERY[value as V2DeliveryStatus] ?? fallback(value);
}

/**
 * Retry is a contract, not a convenience: the API accepts it for FAILED and
 * EXHAUSTED only, and then refuses to process it at all if the endpoint is no
 * longer ACTIVE. Both refusals are answered here so the row can disable the
 * control with the reason in place instead of letting the user discover it.
 */
export function webhookRetryState(
  status: string,
  endpointActive: boolean | null,
): { retryable: boolean; blockedReason: string | null } {
  const failed = status === "FAILED" || status === "EXHAUSTED";
  if (!failed) return { retryable: false, blockedReason: null };
  if (endpointActive === false) {
    return {
      retryable: true,
      blockedReason:
        "This endpoint is disabled or revoked, so a retry can't be sent. Re-enable it first.",
    };
  }
  return { retryable: true, blockedReason: null };
}

// ── CSV export deliveries ────────────────────────────────────────────────────
//
// An export that is still generating, one that failed, and one that finished
// without a downloadable file are three different outcomes with three different
// next steps. The last one is the easy defect: the delivery reads SUCCEEDED, so
// a naive row offers Download — and the API answers 409 "not ready to
// download". The copy says exactly what is known (the file is not stored) and
// not what is guessed (that it "expired"), because nothing in the contract
// records an expiry.

const EXPORT_DELIVERY: Record<V2DeliveryStatus, LifecycleMeta> = {
  PENDING: { label: "Queued", tone: "progress", transitional: true },
  DELIVERING: { label: "Generating", tone: "progress", transitional: true },
  SUCCEEDED: { label: "Ready", tone: "positive", transitional: false },
  FAILED: { label: "Failed", tone: "critical", transitional: false },
  EXHAUSTED: {
    label: "Retries exhausted",
    tone: "critical",
    transitional: false,
  },
};

const NO_FILE: LifecycleMeta = {
  label: "File unavailable",
  tone: "muted",
  transitional: false,
};

export interface ExportDeliveryView {
  meta: LifecycleMeta;
  /** True only when the API will actually serve the artifact. */
  downloadable: boolean;
  /**
   * Why downloading is unavailable, stated in place. `null` when the export is
   * downloadable, or when it is still running and there is nothing to explain.
   */
  blockedReason: string | null;
}

export function exportDeliveryView(
  delivery: Pick<V2ExportDeliveryDTO, "status" | "artifactAssetId">,
): ExportDeliveryView {
  if (delivery.status === "SUCCEEDED") {
    if (delivery.artifactAssetId) {
      return {
        meta: EXPORT_DELIVERY.SUCCEEDED,
        downloadable: true,
        blockedReason: null,
      };
    }
    return {
      meta: NO_FILE,
      downloadable: false,
      blockedReason:
        "This export finished but its file isn't stored any more. Run a new export to download current data.",
    };
  }

  const meta = EXPORT_DELIVERY[delivery.status as V2DeliveryStatus];
  if (!meta) {
    return {
      meta: fallback(delivery.status),
      downloadable: false,
      blockedReason: null,
    };
  }

  return {
    meta,
    downloadable: false,
    blockedReason: meta.transitional
      ? null
      : "This export didn't produce a file. Run a new export to try again.",
  };
}
