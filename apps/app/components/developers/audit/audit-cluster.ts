import type { V2ProjectActionAuditDTO } from "@workspace/types";
import { humanizeLabel } from "@/lib/format";

/**
 * Clustering for the activity log.
 *
 * The audit table records one row per mutation and nothing ties rows to the
 * request that caused them, so a bulk approve or an import lands as N
 * near-identical lines. The next best signal is the one a reader would use:
 * the same actor, acting again within a few minutes, is one burst of work.
 * Clustering is display-only — every underlying event stays intact and
 * reachable inside its block.
 */

/** Max gap between consecutive events for them to read as one burst. */
export const CLUSTER_GAP_MS = 10 * 60 * 1000;

export interface AuditCluster {
  /** Stable key — the id of the newest event in the burst. */
  key: string;
  /** Events newest-first, exactly as the API page ordered them. */
  events: V2ProjectActionAuditDTO[];
}

/** The same actor, acting again with no more than the burst gap between. */
function continuesBurst(
  previous: V2ProjectActionAuditDTO,
  event: V2ProjectActionAuditDTO,
): boolean {
  if (previous.actorType !== event.actorType) return false;
  if (previous.actorId !== event.actorId) return false;
  const gapMs = Math.abs(
    new Date(previous.createdAt).getTime() -
      new Date(event.createdAt).getTime(),
  );
  return gapMs <= CLUSTER_GAP_MS;
}

/**
 * Group a newest-first page of events into bursts: consecutive events by the
 * same actor with no more than a ten-minute gap between neighbours. The
 * window is rolling, so a long import that logs every minute stays one block.
 */
export function clusterAuditEvents(
  events: V2ProjectActionAuditDTO[],
): AuditCluster[] {
  const clusters: AuditCluster[] = [];

  for (const event of events) {
    const current = clusters[clusters.length - 1];
    const previous = current?.events[current.events.length - 1];

    if (previous && continuesBurst(previous, event)) {
      current.events.push(event);
    } else {
      clusters.push({ key: event.id, events: [event] });
    }
  }

  return clusters;
}

/**
 * One line describing what a burst contains: the most frequent actions with
 * counts, and how many kinds were left unsaid — "Response Review Status
 * Updated ×4 · Response Annotated ×2 · +1 more".
 */
export function summarizeCluster(
  events: V2ProjectActionAuditDTO[],
  maxKinds = 2,
): string {
  const counts = new Map<string, number>();
  for (const event of events) {
    counts.set(event.action, (counts.get(event.action) ?? 0) + 1);
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const shown = ranked.slice(0, maxKinds).map(([action, count]) => {
    const label = humanizeLabel(action);
    return count > 1 ? `${label} ×${count}` : label;
  });

  const rest = ranked.length - maxKinds;
  if (rest > 0) shown.push(`+${rest} more`);
  return shown.join(" · ");
}
