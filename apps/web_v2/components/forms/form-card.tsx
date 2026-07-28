"use client";

/**
 * FormCard — the grid tile for the forms gallery view.
 *
 * This is one of the three sanctioned bordered containers: a grid tile where
 * the tile *is* the entity. Nothing inside it is allowed to draw a second
 * surface, so the footer separates with a hairline rather than a nested panel.
 *
 * The grid is the visual browse — the tile leads with a real, scaled render of
 * the form. The row view (`form-row`) is the scan-and-act counterpart and leads
 * with the intent icon instead. Both offer the same actions with the same
 * labels, from `useFormActions`, so the two views can't drift apart.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { timeAgo, fmtDateTime } from "@/lib/format";
import type { V2FormSummaryDTO } from "@workspace/types";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { InlineName } from "@/components/studio/inline-name";
import { ItemCard, ItemActionRow } from "@/components/shared";
import { intentMeta } from "@/lib/forms/intents";
import { FormStatusBadge } from "./form-status-badge";
import { FormPreviewLauncher } from "./form-preview-launcher";
import {
  ALWAYS_COLLAPSE,
  formTitle,
  isPublished,
  useFormActions,
} from "./form-row";

interface FormCardProps {
  slug: string;
  form: V2FormSummaryDTO;
  onDelete: () => void;
  onToggleOpen: () => void;
  onRename: (next: string) => void;
}

export const FormCard = React.memo(function FormCard({
  slug,
  form,
  onDelete,
  onToggleOpen,
  onRename,
}: FormCardProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const meta = intentMeta(form.intent);
  const Icon = meta.icon;
  const name = formTitle(form);
  const published = isPublished(form);
  const inactive = form.status === "ARCHIVED" || !form.open;

  // No `onPreview`: the tile's own thumbnail is the preview, and offering the
  // same thing twice on one card is noise.
  const actions = useFormActions({
    slug,
    form,
    onToggleOpen,
    onDeleteRequest: () => setDeleteOpen(true),
  });

  return (
    <>
      <ItemCard
        inactive={inactive}
        data-testid="form-card"
        aria-label={`${name} (${meta.label})`}
        preview={
          <FormPreviewLauncher
            form={form}
            virtualWidth={720}
            inactive={inactive}
            className="aspect-[16/10] w-full"
          />
        }
        footer={
          <ItemActionRow
            actions={actions}
            collapseUnder={ALWAYS_COLLAPSE}
            visibleWhenCollapsed={2}
            className="border-t border-border/60 px-2.5 py-2"
          />
        }
      >
        <div className="space-y-1 px-3.5 pb-3 pt-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <InlineName
                value={name}
                muted={inactive}
                dirty={false}
                onCommit={onRename}
              />
            </div>
            <FormStatusBadge
              status={form.status}
              open={form.open}
              className="mt-0.5 shrink-0"
            />
          </div>

          {/* One metadata line, one state line — both exactly one type step
              below the title, so the tile reads as two facts, not five. */}
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded",
                meta.accent,
              )}
              aria-hidden
            >
              <Icon className="size-2.5" weight="bold" />
            </span>
            <span className="shrink-0">{meta.label}</span>
            {form.slug && (
              <>
                <span className="text-border" aria-hidden>
                  ·
                </span>
                <span className="min-w-0 truncate font-mono">
                  /f/{form.slug}
                </span>
              </>
            )}
          </p>

          <p className="text-xs tabular-nums text-muted-foreground">
            {published ? (
              <>
                <span className="font-medium text-foreground">
                  v{form.currentVersion}
                </span>{" "}
                published
                <span className="mx-1.5 text-border" aria-hidden>
                  ·
                </span>
              </>
            ) : (
              <>
                Not published yet
                <span className="mx-1.5 text-border" aria-hidden>
                  ·
                </span>
              </>
            )}
            <span title={fmtDateTime(form.updatedAt)}>
              updated {timeAgo(form.updatedAt)}
            </span>
          </p>
        </div>
      </ItemCard>

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
