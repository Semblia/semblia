"use client";

/**
 * StatusBadge / StatusDot — the app's one status vocabulary.
 *
 * Rules this enforces, from the list contract:
 *   • one badge per row — colour carries the signal, no icon duplicating it
 *   • badges are never clickable and never a filter control
 *   • labels are Title Case and match the canonical API term, so what the user
 *     reads is what the docs, the API, and support all call it
 *   • raw enum values (`PENDING_VERIFICATION`) never reach a user's eyes
 *   • unknown enum members degrade to a readable label instead of blanking,
 *     because the API can grow values before the web app knows them
 *
 * A dot, not a badge, when the thing is *moving*: dots animate in transitional
 * states only, and pair with a relative time when duration matters, because a
 * dot alone conveys no duration.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { humanizeLabel } from "@/lib/format";
import type {
  V2FormResponseReviewStatus,
  V2FormResponsePublishStatus,
  V2SubmissionModerationDecision,
  V2SubmissionModerationRunStatus,
  V2ImportJobStatus,
  V2ImportAvailability,
} from "@workspace/types";

// ── Tones ────────────────────────────────────────────────────────────────────

export type StatusTone =
  /** Live, approved, healthy. */
  | "positive"
  /** Needs a human: pending review, flagged, setup required. */
  | "attention"
  /** Failed, rejected, blocked. */
  | "critical"
  /** In flight. */
  | "progress"
  /** Inert but fine: draft, private, archived. */
  | "neutral"
  /** Deliberately de-emphasised: archived, suppressed, superseded. */
  | "muted";

export interface StatusMeta {
  label: string;
  tone: StatusTone;
}

const TONE_VARIANT: Record<
  StatusTone,
  { variant: "secondary" | "outline" | "success" | "warning" | "destructive" }
> = {
  positive: { variant: "success" },
  attention: { variant: "warning" },
  critical: { variant: "destructive" },
  progress: { variant: "secondary" },
  neutral: { variant: "outline" },
  muted: { variant: "outline" },
};

const TONE_DOT: Record<StatusTone, string> = {
  positive: "bg-success",
  attention: "bg-warning",
  critical: "bg-destructive",
  progress: "bg-brand",
  neutral: "bg-muted-foreground/50",
  muted: "bg-muted-foreground/30",
};

// ── Badge ────────────────────────────────────────────────────────────────────

export interface StatusBadgeProps extends StatusMeta {
  className?: string;
}

export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  return (
    <Badge
      variant={TONE_VARIANT[tone].variant}
      className={cn(
        "text-[10px] font-medium",
        tone === "muted" && "text-muted-foreground/70",
        tone === "neutral" && "text-muted-foreground",
        className,
      )}
    >
      {label}
    </Badge>
  );
}

// ── Dot ──────────────────────────────────────────────────────────────────────

export interface StatusDotProps extends StatusMeta {
  /** True while the state is still moving — the only case that animates. */
  transitional?: boolean;
  /** Relative time, rendered after the label. A dot alone has no duration. */
  since?: React.ReactNode;
  className?: string;
}

export function StatusDot({
  label,
  tone,
  transitional = false,
  since,
  className,
}: StatusDotProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <span className="relative flex size-1.5 shrink-0">
        {transitional && (
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping",
              TONE_DOT[tone],
            )}
          />
        )}
        <span
          aria-hidden
          className={cn("size-1.5 rounded-full", TONE_DOT[tone])}
        />
      </span>
      <span className="font-medium text-foreground">{label}</span>
      {since != null && (
        <>
          <span aria-hidden className="text-border">
            ·
          </span>
          <span>{since}</span>
        </>
      )}
    </span>
  );
}

// ── Canonical enum registries ────────────────────────────────────────────────
//
// Each maps one API enum to its user-facing label and tone. Every lookup ends
// with a fallback so an enum value the API grows before the web app does still
// renders something a human can read.

function fallback(value: string, tone: StatusTone = "neutral"): StatusMeta {
  return { label: humanizeLabel(value.toLowerCase()), tone };
}

/**
 * Shared lookup for registries whose entries also carry a `transitional` flag.
 * An unknown enum value is, by definition, not known to be moving.
 */
function transitionalMeta<K extends string>(
  registry: Record<K, StatusMeta & { transitional: boolean }>,
  value: string,
): StatusMeta & { transitional: boolean } {
  return registry[value as K] ?? { ...fallback(value), transitional: false };
}

const REVIEW_STATUS: Record<V2FormResponseReviewStatus, StatusMeta> = {
  PENDING: { label: "Pending review", tone: "attention" },
  APPROVED: { label: "Approved", tone: "positive" },
  REJECTED: { label: "Rejected", tone: "critical" },
  SPAM: { label: "Spam", tone: "critical" },
  ARCHIVED: { label: "Archived", tone: "muted" },
};

export function reviewStatusMeta(value: string): StatusMeta {
  return REVIEW_STATUS[value as V2FormResponseReviewStatus] ?? fallback(value);
}

const PUBLISH_STATUS: Record<V2FormResponsePublishStatus, StatusMeta> = {
  PRIVATE: { label: "Private", tone: "neutral" },
  PUBLISHABLE: { label: "Ready to feature", tone: "neutral" },
  PUBLISHED: { label: "Featured", tone: "positive" },
  UNPUBLISHED: { label: "Unfeatured", tone: "muted" },
};

export function publishStatusMeta(value: string): StatusMeta {
  return (
    PUBLISH_STATUS[value as V2FormResponsePublishStatus] ?? fallback(value)
  );
}

const MODERATION_DECISION: Record<V2SubmissionModerationDecision, StatusMeta> =
  {
    APPROVE: { label: "Looks clean", tone: "positive" },
    REVIEW: { label: "Needs a look", tone: "attention" },
    REJECT: { label: "Flagged", tone: "critical" },
  };

export function moderationDecisionMeta(value: string): StatusMeta {
  return (
    MODERATION_DECISION[value as V2SubmissionModerationDecision] ??
    fallback(value)
  );
}

const MODERATION_RUN_STATUS: Record<
  V2SubmissionModerationRunStatus,
  StatusMeta & { transitional: boolean }
> = {
  PENDING: { label: "Queued", tone: "progress", transitional: true },
  ENQUEUED: { label: "Queued", tone: "progress", transitional: true },
  RUNNING: { label: "Scanning", tone: "progress", transitional: true },
  SUCCEEDED: { label: "Checked", tone: "positive", transitional: false },
  FAILED: { label: "Check failed", tone: "critical", transitional: false },
  SUPPRESSED: { label: "Not checked", tone: "muted", transitional: false },
};

export function moderationRunMeta(
  value: string,
): StatusMeta & { transitional: boolean } {
  return transitionalMeta(MODERATION_RUN_STATUS, value);
}

const IMPORT_JOB_STATUS: Record<
  V2ImportJobStatus,
  StatusMeta & { transitional: boolean }
> = {
  QUEUED: { label: "Queued", tone: "progress", transitional: true },
  RUNNING: { label: "Importing", tone: "progress", transitional: true },
  SUCCEEDED: { label: "Imported", tone: "positive", transitional: false },
  PARTIAL: { label: "Partly imported", tone: "attention", transitional: false },
  FAILED: { label: "Failed", tone: "critical", transitional: false },
};

export function importJobMeta(
  value: string,
): StatusMeta & { transitional: boolean } {
  return transitionalMeta(IMPORT_JOB_STATUS, value);
}

const IMPORT_AVAILABILITY: Record<V2ImportAvailability, StatusMeta> = {
  AVAILABLE: { label: "Ready", tone: "positive" },
  SETUP_REQUIRED: { label: "Setup required", tone: "attention" },
  MANUAL_ONLY: { label: "Manual only", tone: "neutral" },
  BLOCKED: { label: "Unavailable", tone: "muted" },
};

export function importAvailabilityMeta(value: string): StatusMeta {
  return (
    IMPORT_AVAILABILITY[value as V2ImportAvailability] ?? {
      // An availability the app doesn't recognise is not knowably usable, so it
      // reads as unavailable rather than as its raw enum name — guessing in the
      // permissive direction would invite a click into a dead end.
      label: "Unavailable",
      tone: "muted",
    }
  );
}
