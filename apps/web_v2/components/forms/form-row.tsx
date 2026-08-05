"use client";

/**
 * FormRow — one form in the list view.
 *
 * Row anatomy, matched to the skeleton that stands in for it while the list
 * loads (`ListSkeleton leading="preview" trailing`):
 *
 *   ┌────────┐ Form name             views · responses    one badge   updated
 *   │preview │ Testimonial · /f/slug · v3
 *   └────────┘ [Edit form] [Copy link]                                    [⋯]
 *
 * Three deliberate choices:
 *
 *  1. **Preview-led, and the preview is the row's left edge.** A live scaled
 *     render spans the row's full height flush to its edges (`ItemRow
 *     leadingFlush`, sized by the shared `PREVIEW_LEADING` the skeleton also
 *     reserves), and every other part of the row — title, metadata, metrics,
 *     the action row — begins after it in one column. Boxed inside the row's
 *     padding it was a fixed rectangle floating in whitespace with the actions
 *     starting back under it, which read as two unrelated blocks. Clicking the
 *     preview opens the full-page preview.
 *  2. **Two controls, then a menu.** Five inline buttons per row is the clutter
 *     the list contract forbids. Edit and Copy link stay in place; open/close
 *     and delete move behind the dots.
 *  3. **Copy link states why it can't run.** An unpublished form has no
 *     shareable link, and the old row let you click anyway and answered with a
 *     toast. It is now disabled with the reason attached to the control.
 */

import * as React from "react";
import { toast } from "sonner";
import {
  PencilSimpleIcon,
  LinkSimpleIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { timeAgo, fmtDateTime, fmtCount } from "@/lib/format";
import { hostedFormLink } from "@/lib/semblia-urls";
import { formStudioPath } from "@/lib/routes";
import type { V2FormSummaryDTO } from "@workspace/types";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { InlineName } from "@/components/studio/inline-name";
import {
  ItemRow,
  ItemActionRow,
  PREVIEW_LEADING,
  type ItemAction,
} from "@/components/shared";
import { intentMeta } from "@/lib/forms/intents";
import { FormStatusBadge } from "./form-status-badge";
import { FormPreviewLauncher } from "./form-preview-launcher";

/**
 * `ItemActionRow` only opens its overflow menu once its measured container
 * falls below a width threshold, so the only way to ask it for a *deterministic*
 * two-controls-plus-menu shape is to hand it a threshold no container will
 * reach. Reported as a primitive gap rather than forked here.
 */
export const ALWAYS_COLLAPSE = 100_000;

/** A form with no name still needs something to click on. */
export function formTitle(form: V2FormSummaryDTO): string {
  return form.name.trim() || "Untitled form";
}

/**
 * Has a version people can actually reach. Derived once so the metadata line,
 * the card, and the Copy link refusal cannot tell three different stories about
 * the same form.
 */
export function isPublished(form: V2FormSummaryDTO): boolean {
  return form.status === "PUBLISHED" && form.currentVersion != null;
}

// ── Shared action vocabulary ─────────────────────────────────────────────────
//
// The row and the card offer the same five things with the same labels and the
// same disabled reasons. Defining them twice is how the two views drift, so
// they are defined once, here, and the card imports them.

export interface FormActionsOptions {
  slug: string;
  form: V2FormSummaryDTO;
  onToggleOpen: () => void;
  onDeleteRequest: () => void;
}

export function useFormActions({
  slug,
  form,
  onToggleOpen,
  onDeleteRequest,
}: FormActionsOptions): ItemAction[] {
  const hostedLink = form.slug ? hostedFormLink(form.slug) : null;
  // Two different facts, and the old single sentence was false for one of them:
  // publishing does not mint a public address (`Form.slug` is nullable and
  // nothing in the product assigns it), so a live form can reach here too.
  // Telling its owner to "publish this form" would be a refusal that names the
  // wrong cause and points at an action they have already taken.
  const linkBlockedReason = hostedLink
    ? undefined
    : isPublished(form)
      ? "Published, but this form has no public address yet."
      : "Publish this form to get a shareable link.";

  const handleCopyLink = React.useCallback(async () => {
    // Unreachable while the action is disabled; kept so the handler can never
    // write `null` to the clipboard if that guard ever changes.
    if (!hostedLink) return;
    try {
      await navigator.clipboard.writeText(hostedLink);
      toast.success("Form link copied");
    } catch {
      toast.error("Couldn't copy the form link.");
    }
  }, [hostedLink]);

  return React.useMemo(() => {
    const actions: ItemAction[] = [
      {
        id: "edit",
        label: "Edit form",
        icon: PencilSimpleIcon,
        href: formStudioPath(slug, form.id),
        pinned: true,
      },
      {
        id: "link",
        label: "Copy link",
        icon: LinkSimpleIcon,
        pinned: true,
        disabled: !hostedLink,
        disabledReason: linkBlockedReason,
        onSelect: () => {
          void handleCopyLink();
        },
      },
    ];

    actions.push(
      {
        id: "toggle",
        label: form.open ? "Close form" : "Open form",
        icon: form.open ? EyeSlashIcon : EyeIcon,
        tone: form.open ? "warning" : "success",
        onSelect: onToggleOpen,
      },
      {
        id: "delete",
        label: "Delete form",
        icon: TrashIcon,
        tone: "danger",
        onSelect: onDeleteRequest,
      },
    );

    return actions;
  }, [
    slug,
    form.id,
    form.open,
    hostedLink,
    linkBlockedReason,
    handleCopyLink,
    onToggleOpen,
    onDeleteRequest,
  ]);
}

// ── Row ──────────────────────────────────────────────────────────────────────

interface FormRowProps {
  slug: string;
  form: V2FormSummaryDTO;
  onDelete: () => void;
  onToggleOpen: () => void;
  onRename: (next: string) => void;
}

export const FormRow = React.memo(function FormRow({
  slug,
  form,
  onDelete,
  onToggleOpen,
  onRename,
}: FormRowProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const meta = intentMeta(form.intent);
  const name = formTitle(form);
  const inactive = form.status === "ARCHIVED" || !form.open;

  // The thumbnail already opens the preview, so the overflow menu doesn't
  // offer the same thing again.
  const actions = useFormActions({
    slug,
    form,
    onToggleOpen,
    onDeleteRequest: () => setDeleteOpen(true),
  });

  return (
    <>
      <ItemRow
        inactive={inactive}
        aria-label={`${name} (${meta.label})`}
        padding="default"
        leadingFlush
        leading={
          <FormPreviewLauncher
            form={form}
            virtualWidth={480}
            inactive={inactive}
            minimal
            className={cn(PREVIEW_LEADING, "bg-surface")}
          />
        }
        title={
          <InlineName
            value={name}
            muted={inactive}
            dirty={false}
            onCommit={onRename}
          />
        }
        subtitle={<FormRowMeta form={form} intentLabel={meta.label} />}
        metrics={<FormRowMetrics metrics={form.metrics} />}
        trailing={
          <div className="flex items-center gap-2">
            <FormStatusBadge status={form.status} open={form.open} />
            <span
              className="hidden text-xs tabular-nums text-muted-foreground sm:block"
              title={fmtDateTime(form.updatedAt)}
            >
              {timeAgo(form.updatedAt)}
            </span>
          </div>
        }
        actions={
          <ItemActionRow
            actions={actions}
            collapseUnder={ALWAYS_COLLAPSE}
            visibleWhenCollapsed={2}
          />
        }
      />

      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        intent="danger"
        title={<>Delete &ldquo;{name}&rdquo;?</>}
        description={
          <>
            This permanently removes the form and its draft. Published versions
            stop accepting responses. This action cannot be undone.
          </>
        }
        cancelLabel="Keep form"
        confirmLabel="Delete form"
        onConfirm={onDelete}
      />
    </>
  );
});

/**
 * The numbers a list is scanned for, inline where the eye already is. Real
 * zeroes render as `0`; the rate is omitted while there are no views because
 * a percentage of nothing asserts nothing. Shared with the grid card so the
 * two views answer the owner's "is it working?" identically (P6).
 */
export function FormRowMetrics({
  metrics,
}: {
  metrics: V2FormSummaryDTO["metrics"];
}) {
  return (
    <span className="text-xs tabular-nums text-muted-foreground">
      <span className="font-medium text-foreground">
        {fmtCount(metrics.views)}
      </span>{" "}
      {metrics.views === 1 ? "view" : "views"}
      <span className="mx-1.5 text-border" aria-hidden>
        ·
      </span>
      <span className="font-medium text-foreground">
        {fmtCount(metrics.submissions)}
      </span>{" "}
      {metrics.submissions === 1 ? "response" : "responses"}
      {metrics.responseRate !== null && (
        <>
          <span className="mx-1.5 text-border" aria-hidden>
            ·
          </span>
          {Math.round(metrics.responseRate * 100)}%
        </>
      )}
    </span>
  );
}

/**
 * The row's one metadata line, exactly one type step below the title.
 *
 * A form that has never been published has no public path and no version — that
 * is a state, not a missing value, so it is named rather than dashed.
 */
function FormRowMeta({
  form,
  intentLabel,
}: {
  form: V2FormSummaryDTO;
  intentLabel: string;
}) {
  const published = isPublished(form);

  return (
    <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
      <span className="shrink-0">{intentLabel}</span>

      {form.slug && (
        <>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <span className="min-w-0 truncate font-mono">/f/{form.slug}</span>
        </>
      )}

      <span className="text-border" aria-hidden>
        ·
      </span>
      <span className="shrink-0 tabular-nums">
        {published ? `v${form.currentVersion} published` : "Not published yet"}
      </span>
    </p>
  );
}
