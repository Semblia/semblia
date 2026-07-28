"use client";

/**
 * ModerationVerdict — what the automated check thought, shown honestly.
 *
 * The backend has run every submission through text, image, audio, and video
 * moderation since Phase 6, and the UI has never shown a single result of it.
 * That is worse than not having the feature: the owner sees submissions arrive
 * pre-sorted with no idea why, and cannot tell a machine decision from a
 * human one.
 *
 * Framing rules (P6 — screens tell the truth about the system):
 *   • the machine's opinion is advisory, and says so in words
 *   • it is always visible that the human decision overrides it
 *   • a check that did not run says "not checked" instead of implying "clean"
 *   • a check that *failed* says so, and does not read as a pass
 *   • provider category scores are developer detail, so they live behind a
 *     disclosure rather than in the reviewer's face
 */

import * as React from "react";
import { Robot, CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { StatusBadge, StatusDot } from "@/components/shared";
import { moderationDecisionMeta, moderationRunMeta } from "@/components/shared";
import { humanizeLabel, timeAgo } from "@/lib/format";
import type {
  V2SubmissionModerationRunDTO,
  V2SubmissionModerationDecision,
} from "@workspace/types";

/**
 * The strictest decision across every artifact wins: if the text is clean but a
 * video frame was flagged, the submission is flagged. Reporting the average, or
 * the first run, would let a real problem hide behind a passing sibling.
 */
const DECISION_RANK: Record<V2SubmissionModerationDecision, number> = {
  APPROVE: 0,
  REVIEW: 1,
  REJECT: 2,
};

export interface ModerationSummary {
  /** Strictest decision across all completed runs. */
  decision: V2SubmissionModerationDecision | null;
  /** Distinct flags raised, deduped across artifacts. */
  flags: string[];
  /** True while any run is still queued or scanning. */
  pending: boolean;
  /** True when a run errored — the absence of flags proves nothing. */
  failed: boolean;
  /** True when there is nothing to report at all. */
  empty: boolean;
}

export function summarizeModeration(
  runs: V2SubmissionModerationRunDTO[],
): ModerationSummary {
  if (runs.length === 0) {
    return {
      decision: null,
      flags: [],
      pending: false,
      failed: false,
      empty: true,
    };
  }

  let decision: V2SubmissionModerationDecision | null = null;
  const flags = new Set<string>();
  let pending = false;
  let failed = false;

  for (const run of runs) {
    if (run.status === "PENDING" || run.status === "ENQUEUED") pending = true;
    if (run.status === "RUNNING") pending = true;
    if (run.status === "FAILED") failed = true;
    for (const flag of run.flags) flags.add(flag);
    if (
      run.decision &&
      (decision === null ||
        DECISION_RANK[run.decision] > DECISION_RANK[decision])
    ) {
      decision = run.decision;
    }
  }

  return {
    decision,
    flags: [...flags],
    pending,
    failed,
    empty: decision === null && !pending && !failed && flags.size === 0,
  };
}

// ── Row-level indicator ──────────────────────────────────────────────────────

/**
 * The compact form for a list row. Renders nothing when the automated check had
 * nothing to say — a silent pass is not information worth a row's width.
 */
export function ModerationFlag({
  runs,
  className,
}: {
  runs: V2SubmissionModerationRunDTO[];
  className?: string;
}) {
  const summary = summarizeModeration(runs);

  if (summary.pending) {
    return (
      <StatusDot
        label="Checking"
        tone="progress"
        transitional
        className={className}
      />
    );
  }
  if (summary.failed) {
    return (
      <StatusBadge label="Check failed" tone="muted" className={className} />
    );
  }
  if (summary.decision === "REJECT" || summary.decision === "REVIEW") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-medium",
          summary.decision === "REJECT"
            ? "text-destructive"
            : "text-muted-foreground",
          className,
        )}
        title={
          summary.flags.length > 0
            ? `Flagged: ${summary.flags.map(humanizeLabel).join(", ")}`
            : "Flagged by the automated check"
        }
      >
        <Robot className="size-3.5" weight="bold" aria-hidden />
        {summary.flags.length > 0 ? humanizeLabel(summary.flags[0]) : "Flagged"}
        {summary.flags.length > 1 && (
          <span className="tabular-nums">+{summary.flags.length - 1}</span>
        )}
      </span>
    );
  }
  return null;
}

// ── Detail panel ─────────────────────────────────────────────────────────────

export function ModerationVerdict({
  runs,
  /** Set when a human has already ruled, so the override is stated as fact. */
  humanDecision,
  className,
}: {
  runs: V2SubmissionModerationRunDTO[];
  humanDecision?: { label: string; at: string | null } | null;
  className?: string;
}) {
  const summary = summarizeModeration(runs);

  if (runs.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        This submission wasn&apos;t checked automatically. Auto-moderation is
        off for this project, or it arrived before it was turned on.
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Robot
          className="size-3.5 shrink-0 text-muted-foreground"
          weight="bold"
          aria-hidden
        />
        {summary.pending ? (
          <StatusDot label="Still checking" tone="progress" transitional />
        ) : summary.decision ? (
          <StatusBadge {...moderationDecisionMeta(summary.decision)} />
        ) : (
          <StatusBadge label="No verdict" tone="muted" />
        )}
        <span className="text-xs text-muted-foreground">
          Automated check — advisory only
        </span>
      </div>

      {summary.failed && (
        <p className="text-xs text-muted-foreground">
          At least one check couldn&apos;t complete, so a clean result here
          doesn&apos;t cover the whole submission. Read it in full before
          approving.
        </p>
      )}

      {summary.flags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {summary.flags.map((flag) => (
            <li key={flag}>
              <StatusBadge label={humanizeLabel(flag)} tone="attention" />
            </li>
          ))}
        </ul>
      )}

      {humanDecision ? (
        <p className="text-xs text-foreground">
          You decided:{" "}
          <strong className="font-medium">{humanDecision.label}</strong>
          {humanDecision.at && (
            <span className="text-muted-foreground">
              {" "}
              · {timeAgo(humanDecision.at)}
            </span>
          )}
          . Your decision is what counts — the check above never publishes or
          rejects on its own.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nothing is published or rejected on this verdict alone. Your decision
          is the one that applies.
        </p>
      )}

      <RunBreakdown runs={runs} />
    </div>
  );
}

function RunBreakdown({ runs }: { runs: V2SubmissionModerationRunDTO[] }) {
  return (
    <details className="group/runs">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[11px] text-muted-foreground underline-offset-2 hover:underline">
        <CaretDown
          className="size-3 transition-transform duration-(--duration-base) group-open/runs:rotate-180"
          weight="bold"
          aria-hidden
        />
        {runs.length === 1 ? "1 check" : `${runs.length} checks`}
      </summary>

      <dl className="mt-2 space-y-0">
        {runs.map((run) => {
          const meta = moderationRunMeta(run.status);
          return (
            <div
              key={run.id}
              className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2 last:border-b-0"
            >
              <dt className="min-w-0 text-[11px] text-muted-foreground">
                {humanizeLabel(run.artifactType)}
                <span aria-hidden className="mx-1 text-border">
                  ·
                </span>
                {run.provider}
              </dt>
              <dd className="shrink-0 text-right">
                <StatusDot
                  label={meta.label}
                  tone={meta.tone}
                  transitional={meta.transitional}
                  since={run.completedAt ? timeAgo(run.completedAt) : undefined}
                />
                {run.reason && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {run.reason}
                  </p>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </details>
  );
}
