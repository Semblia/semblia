"use client";

/**
 * ResponseRow — a single incoming testimonial in the moderation inbox. Built on
 * the shared ItemRow/ItemActionRow primitives (same instrument as FormRow), it
 * reads author → excerpt → rating → review/publish state, with the moderation
 * actions appropriate to the response's state (Approve/Reject when pending,
 * Feature/Unpublish when approved, Delete always).
 */

import * as React from "react";
import {
  CheckIcon,
  XIcon,
  StarIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { timeAgo, nameInitials } from "@/lib/format";
import type {
  V2ResponseDTO,
  V2FormResponseReviewStatus,
  V2FormResponsePublishStatus,
} from "@workspace/types";
import { ItemRow, ItemActionRow, type ItemAction } from "@/components/shared";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { extractResponseBody } from "@/lib/widgets/response-to-testimonial";

const REVIEW_BADGE: Record<
  V2FormResponseReviewStatus,
  { label: string; cls: string }
> = {
  PENDING: {
    label: "Pending",
    cls: "border-warning/30 bg-warning/10 text-warning",
  },
  APPROVED: {
    label: "Approved",
    cls: "border-transparent bg-success/10 text-success",
  },
  REJECTED: {
    label: "Rejected",
    cls: "border-transparent bg-destructive/10 text-destructive",
  },
  SPAM: {
    label: "Spam",
    cls: "border-transparent bg-destructive/10 text-destructive",
  },
  ARCHIVED: { label: "Archived", cls: "text-muted-foreground" },
};

interface ResponseRowProps {
  response: V2ResponseDTO;
  busy?: boolean;
  onApprove: () => void;
  onReject: () => void;
  onTogglePublish: (next: V2FormResponsePublishStatus) => void;
  onDelete: () => void;
}

export const ResponseRow = React.memo(function ResponseRow({
  response,
  busy,
  onApprove,
  onReject,
  onTogglePublish,
  onDelete,
}: ResponseRowProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const author = response.authorName?.trim() || "Anonymous";
  const body = extractResponseBody(response.answers) ?? "—";
  const review = REVIEW_BADGE[response.reviewStatus];
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
      label: isPublished ? "Unpublish" : "Feature",
      icon: isPublished ? EyeSlashIcon : EyeIcon,
      tone: isPublished ? "warning" : "success",
      pinned: true,
      disabled: busy,
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
        aria-label={`Response from ${author}`}
        padding="default"
        leading={
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/12 text-[11px] font-semibold text-brand",
              inactive && "opacity-60",
            )}
            aria-hidden
          >
            {nameInitials(response.authorName, "?")}
          </span>
        }
        title={
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {author}
            </span>
            {response.ratingValue != null && (
              <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium tabular-nums text-amber-500">
                <StarIcon className="size-3" weight="fill" aria-hidden />
                {response.ratingValue}
              </span>
            )}
          </span>
        }
        subtitle={
          <p className="mt-0.5 line-clamp-2 max-w-prose text-xs leading-relaxed text-muted-foreground">
            {body}
          </p>
        }
        trailing={
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                review.cls,
              )}
            >
              {review.label}
            </span>
            {isPublished && (
              <span className="hidden shrink-0 items-center rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand sm:inline-flex">
                Featured
              </span>
            )}
            <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">
              {timeAgo(new Date(response.createdAt))}
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
