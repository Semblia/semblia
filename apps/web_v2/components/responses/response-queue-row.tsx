"use client";

/**
 * ResponseQueueRow — one submission in the full-width queue. Opening a row
 * navigates to the response's own page.
 *
 * Anatomy (V1–V3 in `visual-language.md`):
 *
 *   ┌────────────────────────────────────────────────┐
 *   │ (AL)  Ada Lovelace                       2d    │  avatar+state · name · time
 *   │       Semblia helped us ship twice as fast…    │  excerpt, 2-line clamp
 *   │       Website form · ★4/5 · Flagged            │  meta, dot-separated
 *   └────────────────────────────────────────────────┘
 *
 * The queue is a list of people saying things, so the row leads with the
 * person (P8, 2026-08-02): an initials avatar with the lifecycle glyph on
 * its corner — state still reads straight down the column (V2).
 *
 * What this deliberately is not:
 *
 *  • It has no permanently-visible action strip. Three buttons repeated under
 *    every row added ~40px each and turned a queue into a form. Approve and
 *    reject appear on hover and on keyboard focus in a fixed slot; the full,
 *    labelled decision lives in the record column where the decision is made.
 *  • Nothing is pinned to the right except the timestamp. A badge parked at the
 *    far edge of a wide row leaves a void down the middle of the list, which is
 *    what the first build did.
 *  • Review state is a glyph in a fixed left slot rather than a pill. It reads
 *    straight down the column and costs no horizontal space.
 */

import * as React from "react";
import { Check, X, Star, VideoCamera, Robot } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { timeAgo, fmtDateTime, nameInitials } from "@/lib/format";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { V2ResponseDTO } from "@workspace/types";
import { extractResponseBody } from "@/lib/widgets/response-to-testimonial";
import { formatImportSourceLabel } from "@/lib/imports/source-label";
import { summarizeModeration } from "./moderation-verdict";

/** Review state as a 6px glyph, one per lifecycle value. */
const STATE_GLYPH: Record<string, { tone: string; label: string }> = {
  PENDING: { tone: "bg-warning", label: "Pending review" },
  APPROVED: { tone: "bg-success", label: "Approved" },
  REJECTED: { tone: "bg-destructive/70", label: "Rejected" },
  SPAM: { tone: "bg-destructive/70", label: "Spam" },
  ARCHIVED: { tone: "bg-muted-foreground/40", label: "Archived" },
};

export interface ResponseQueueRowProps {
  response: V2ResponseDTO;
  highlighted: boolean;
  selected: boolean;
  selectionActive: boolean;
  busy: boolean;
  onOpen: () => void;
  onSelectToggle: (event: React.MouseEvent) => void;
  onApprove: () => void;
  onReject: () => void;
}

export const ResponseQueueRow = React.memo(function ResponseQueueRow({
  response,
  highlighted,
  selected,
  selectionActive,
  busy,
  onOpen,
  onSelectToggle,
  onApprove,
  onReject,
}: ResponseQueueRowProps) {
  const author = response.authorName?.trim() || "Anonymous";
  const body = extractResponseBody(response.answers);
  const glyph = STATE_GLYPH[response.reviewStatus] ?? {
    tone: "bg-muted-foreground/40",
    label: response.reviewStatus,
  };
  const flagged = summarizeModeration(response.moderationRuns);
  const pending = response.reviewStatus === "PENDING";

  return (
    <div
      role="listitem"
      onClick={onOpen}
      data-highlighted={highlighted || undefined}
      className={cn(
        "group/row relative cursor-pointer border-l-2 border-l-transparent px-3 py-2.5 transition-colors duration-(--duration-base) hover:bg-muted/35",
        highlighted && "bg-muted/35",
        selected && "bg-brand/[0.06]",
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Fixed left slot: the author, because a queue is a list of people
            saying things (P8) — recognition before reading. The lifecycle
            glyph rides the avatar's corner so state still reads straight down
            the column (V2). In select mode, or on hover, the slot swaps to
            the checkbox; one slot, never both, so rows never shift. */}
        <span className="relative flex size-7 shrink-0 items-center justify-center">
          <span
            className={cn(
              "transition-opacity duration-(--duration-base)",
              selectionActive || selected
                ? "opacity-0"
                : "opacity-100 group-hover/row:opacity-0",
            )}
          >
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-full bg-brand/12 text-[10px] font-semibold text-brand"
            >
              {nameInitials(author, "?")}
            </span>
            <span
              aria-hidden
              className={cn(
                "absolute -bottom-px -right-px size-2 rounded-full ring-2 ring-background",
                glyph.tone,
              )}
            />
            <span className="sr-only">{glyph.label}</span>
          </span>
          <span
            className={cn(
              "absolute transition-opacity duration-(--duration-base)",
              selectionActive || selected
                ? "opacity-100"
                : "opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100",
            )}
          >
            <Checkbox
              checked={selected}
              aria-label={`Select response from ${author}`}
              onClick={onSelectToggle}
              className="size-[15px]"
            />
          </span>
        </span>

        <div className="min-w-0 flex-1">
          {/* Line 1 — identity, and the only thing allowed at the right edge. */}
          <div className="flex items-baseline gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpen();
              }}
              className="min-w-0 flex-1 truncate rounded-sm text-left text-[13px] font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              {author}
              <span className="sr-only"> — open response</span>
            </button>
            <time
              className="shrink-0 text-[11px] tabular-nums text-muted-foreground/80"
              title={fmtDateTime(response.createdAt)}
            >
              {timeAgo(response.createdAt).replace(" ago", "")}
            </time>
          </div>

          {/* Line 2 — the testimonial itself, the thing being judged. Capped
              to a readable measure on wide rows. */}
          {body ? (
            <p className="mt-0.5 line-clamp-2 max-w-2xl text-xs leading-[1.45] text-muted-foreground">
              {body}
            </p>
          ) : (
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs italic text-muted-foreground">
              <VideoCamera className="size-3" weight="bold" aria-hidden />
              Recorded, no written text
            </p>
          )}

          {/* Line 3 — provenance and signals, dot-separated, left-aligned. */}
          <MetaLine response={response} flagged={flagged.decision} />
        </div>
      </div>

      {/* Hover / focus actions, in a slot that overlays the timestamp so the
          row never reflows when they appear. */}
      {pending && (
        <div
          className={cn(
            "absolute right-2 top-1.5 flex items-center gap-0.5 rounded-md bg-background/95 p-0.5 transition-opacity duration-(--duration-base)",
            "opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100",
          )}
        >
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={busy}
            title="Approve"
            onClick={(event) => {
              event.stopPropagation();
              onApprove();
            }}
            className="size-6 text-muted-foreground hover:bg-success/10 hover:text-success"
          >
            <Check className="size-3.5" weight="bold" aria-hidden />
            <span className="sr-only">Approve response from {author}</span>
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={busy}
            title="Reject"
            onClick={(event) => {
              event.stopPropagation();
              onReject();
            }}
            className="size-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-3.5" weight="bold" aria-hidden />
            <span className="sr-only">Reject response from {author}</span>
          </Button>
        </div>
      )}
    </div>
  );
});

function MetaLine({
  response,
  flagged,
}: {
  response: V2ResponseDTO;
  flagged: ReturnType<typeof summarizeModeration>["decision"];
}) {
  const parts: React.ReactNode[] = [];

  parts.push(
    response.origin === "IMPORT"
      ? formatImportSourceLabel(
          typeof response.sourceMetadata.source === "string"
            ? response.sourceMetadata.source
            : null,
        )
      : (response.form?.name ?? "Form"),
  );

  // A rating renders with its scale or not at all.
  if (response.ratingValue !== null && response.ratingScale) {
    parts.push(
      <span
        key="rating"
        className="inline-flex items-center gap-0.5 tabular-nums"
        aria-label={`Rated ${response.ratingValue} out of ${response.ratingScale}`}
      >
        <Star className="size-2.5 text-amber-500" weight="fill" aria-hidden />
        {response.ratingValue}/{response.ratingScale}
      </span>,
    );
  }

  if (flagged === "REJECT" || flagged === "REVIEW") {
    parts.push(
      <span
        key="flag"
        className={cn(
          "inline-flex items-center gap-0.5",
          flagged === "REJECT" ? "text-destructive" : "text-warning",
        )}
      >
        <Robot className="size-2.5" weight="bold" aria-hidden />
        Flagged
      </span>,
    );
  }

  if (response.publishStatus === "PUBLISHED") {
    parts.push(
      <span key="featured" className="text-brand">
        Featured
      </span>,
    );
  }

  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground/80">
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <span aria-hidden className="text-border">
              ·
            </span>
          )}
          {part}
        </React.Fragment>
      ))}
    </p>
  );
}
