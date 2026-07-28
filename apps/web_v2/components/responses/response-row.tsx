"use client";

/**
 * ResponseRow — one submission in the moderation queue.
 *
 * Row anatomy, applied identically wherever a response appears:
 *   [select] [avatar] author · rating · flag        one badge      time
 *            excerpt / provenance                   [approve] [reject]
 *
 * Three things this row is careful about:
 *
 *  1. **One badge.** Review status is the badge. "Featured" is a second signal
 *     on the same axis, so it renders as a quiet marker beside the timestamp,
 *     not a competing pill.
 *  2. **Never offer what the API will refuse.** Publishing is gated server-side
 *     on per-field consent. The row reads `publishable` and disables Feature
 *     with the reason in place, instead of letting the click return a 409 and a
 *     "try again" toast for something that can never succeed.
 *  3. **A missing body is not an em dash.** A video or audio testimonial has no
 *     text; it says so. `—` there would read as a broken record.
 */

import * as React from "react";
import {
  CheckIcon,
  XIcon,
  StarIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  VideoCameraIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { timeAgo, nameInitials, fmtDateTime } from "@/lib/format";
import type {
  V2ResponseDTO,
  V2FormResponsePublishStatus,
} from "@workspace/types";
import {
  ItemRow,
  ItemActionRow,
  StatusBadge,
  SelectionCheckbox,
  reviewStatusMeta,
  type ItemAction,
} from "@/components/shared";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { formatImportSourceLabel } from "@/lib/imports/source-label";
import { extractResponseBody } from "@/lib/widgets/response-to-testimonial";
import { ModerationFlag } from "./moderation-verdict";

const SAFE_SOURCE_PROTOCOLS = new Set(["http:", "https:"]);

interface ResponseRowProps {
  response: V2ResponseDTO;
  busy?: boolean;
  /** Keyboard cursor position — distinct from selection. */
  highlighted?: boolean;
  /** Selection state. `undefined` turns the checkbox off entirely. */
  selected?: boolean;
  onSelectToggle?: (event: React.MouseEvent) => void;
  /** Open the detail sheet. */
  onOpen?: () => void;
  onApprove: () => void;
  onReject: () => void;
  onTogglePublish: (next: V2FormResponsePublishStatus) => void;
  onDelete: () => void;
}

export const ResponseRow = React.memo(function ResponseRow({
  response,
  busy,
  highlighted = false,
  selected,
  onSelectToggle,
  onOpen,
  onApprove,
  onReject,
  onTogglePublish,
  onDelete,
}: ResponseRowProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const author = response.authorName?.trim() || "Anonymous";
  const body = extractResponseBody(response.answers);
  const review = reviewStatusMeta(response.reviewStatus);
  const isPublished = response.publishStatus === "PUBLISHED";
  const inactive =
    response.reviewStatus === "REJECTED" ||
    response.reviewStatus === "SPAM" ||
    response.reviewStatus === "ARCHIVED";

  const actions: ItemAction[] = [];
  if (response.reviewStatus === "PENDING") {
    actions.push(
      {
        id: "approve",
        // Bare verbs are the documented exception here: in a queue the object
        // is the row itself, and every moderation product ships them bare.
        label: "Approve",
        icon: CheckIcon,
        tone: "success",
        pinned: true,
        disabled: busy,
        onSelect: onApprove,
      },
      {
        id: "reject",
        label: "Reject",
        icon: XIcon,
        tone: "warning",
        pinned: true,
        disabled: busy,
        onSelect: onReject,
      },
    );
  } else if (response.reviewStatus === "APPROVED") {
    actions.push({
      id: "publish",
      label: isPublished ? "Unfeature" : "Feature",
      icon: isPublished ? EyeSlashIcon : EyeIcon,
      tone: isPublished ? "warning" : "success",
      pinned: true,
      // A response whose author withheld consent can never be featured. Say so
      // before the click, not after the request fails.
      disabled: busy || (!isPublished && !response.publishable),
      disabledReason:
        !isPublished && !response.publishable
          ? (response.publishBlockedReason ??
            "The author didn't consent to publishing this.")
          : undefined,
      onSelect: () =>
        onTogglePublish(isPublished ? "UNPUBLISHED" : "PUBLISHED"),
    });
  }
  actions.push({
    id: "delete",
    label: "Delete",
    icon: TrashIcon,
    tone: "danger",
    iconOnly: true,
    pinned: true,
    onSelect: () => setDeleteOpen(true),
  });

  return (
    <>
      <ItemRow
        inactive={inactive}
        padding="default"
        onSurfaceClick={onOpen}
        data-highlighted={highlighted || undefined}
        className={cn(highlighted && "bg-muted/50")}
        leading={
          <div className="flex items-center">
            {selected !== undefined && onSelectToggle && (
              <SelectionCheckbox
                checked={selected}
                onChange={onSelectToggle}
                label={`Select response from ${author}`}
              />
            )}
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/12 text-[11px] font-semibold text-brand",
                inactive && "opacity-60",
              )}
              aria-hidden
            >
              {nameInitials(response.authorName, "?")}
            </span>
          </div>
        }
        title={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {/* The keyboard path into the record. The row itself stays a plain
                surface, because a row that is a button cannot legally contain
                the checkbox and three action buttons it needs to. */}
            {onOpen ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen();
                }}
                className="truncate rounded-sm text-left text-sm font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                {author}
                <span className="sr-only"> — open response</span>
              </button>
            ) : (
              <span className="truncate text-sm font-medium text-foreground">
                {author}
              </span>
            )}
            <ResponseRating
              value={response.ratingValue}
              scale={response.ratingScale}
            />
            <ModerationFlag runs={response.moderationRuns} />
          </span>
        }
        subtitle={<ResponseSubtitle body={body} response={response} />}
        trailing={
          <div className="flex items-center gap-2">
            <StatusBadge {...review} />
            <span
              className="hidden text-xs tabular-nums text-muted-foreground sm:block"
              title={fmtDateTime(response.createdAt)}
            >
              {timeAgo(response.createdAt)}
            </span>
          </div>
        }
        actions={
          <ItemActionRow
            actions={actions}
            collapseUnder={420}
            visibleWhenCollapsed={2}
          />
        }
      />

      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        intent="danger"
        title="Delete this response?"
        description="This permanently removes the testimonial and its private metadata. This action cannot be undone."
        cancelLabel="Keep response"
        confirmLabel="Delete response"
        onConfirm={onDelete}
      />
    </>
  );
});

/**
 * A rating renders with its scale or not at all. `4` alone is a lie when the
 * form was configured out of 10, and the two scales are both in use.
 */
function ResponseRating({
  value,
  scale,
}: {
  value: number | null;
  scale: number | null;
}) {
  if (value === null || !Number.isFinite(value) || !scale) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium tabular-nums text-amber-500"
      aria-label={`Rated ${value} out of ${scale}`}
    >
      <StarIcon className="size-3" weight="fill" aria-hidden />
      {value}
      <span className="text-muted-foreground">/{scale}</span>
    </span>
  );
}

function ResponseSubtitle({
  body,
  response,
}: {
  body: string | null;
  response: V2ResponseDTO;
}) {
  return (
    <div className="mt-0.5 max-w-prose text-xs leading-relaxed text-muted-foreground">
      {body ? (
        <p className="line-clamp-2">{body}</p>
      ) : (
        <p className="inline-flex items-center gap-1 italic">
          <VideoCameraIcon className="size-3.5" weight="bold" aria-hidden />
          Recorded testimonial — no written text
        </p>
      )}
      <ResponseMeta response={response} />
    </div>
  );
}

function ResponseMeta({ response }: { response: V2ResponseDTO }) {
  const featured = response.publishStatus === "PUBLISHED";
  const imported = response.origin === "IMPORT";
  if (!featured && !imported) return null;

  const provenance = imported
    ? sourceProvenance(response.sourceMetadata)
    : null;

  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
      {featured && (
        <span className="inline-flex items-center gap-1 text-brand">
          <EyeIcon className="size-3" weight="bold" aria-hidden />
          Featured in widgets
        </span>
      )}
      {provenance &&
        (provenance.url ? (
          <a
            href={provenance.url}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(event) => event.stopPropagation()}
            className="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={`Source: ${provenance.label}`}
          >
            Source: {provenance.label}
          </a>
        ) : (
          <span>Source: {provenance.label}</span>
        ))}
    </p>
  );
}

function sourceProvenance(metadata: Record<string, unknown>) {
  const source = typeof metadata.source === "string" ? metadata.source : null;
  const sourceUrl =
    typeof metadata.sourceUrl === "string"
      ? safeSourceUrl(metadata.sourceUrl)
      : null;
  return { label: formatImportSourceLabel(source), url: sourceUrl };
}

function safeSourceUrl(value: string) {
  try {
    const url = new URL(value);
    return SAFE_SOURCE_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}
