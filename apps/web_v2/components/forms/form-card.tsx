"use client";

/**
 * FormCard — the gallery card for the forms grid view. Visual-first: a clean
 * static mini-form preview sits at the top, with an inline-editable name, a
 * status badge, an intent meta line, a minimal KPI (publish version + last
 * activity), and the shared action row.
 *
 * Mirrors WidgetCard so the two listing pages read as one product.
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
import { timeAgo } from "@/lib/format";
import type { V2FormSummaryDTO } from "@workspace/types";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { InlineName } from "@/components/studio/inline-name";
import { ItemCard, ItemActionRow, type ItemAction } from "@/components/shared";
import { intentMeta } from "@/lib/forms/intents";
import { FormStatusBadge } from "./form-status-badge";
import { FormPreviewLauncher } from "./form-preview-launcher";

const HOSTED_BASE = "forms.semblia.com/f";

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
  const isPublished =
    form.status === "PUBLISHED" && form.currentVersion != null;
  const hostedUrl = form.slug ? `${HOSTED_BASE}/${form.slug}` : null;
  const editHref = `/projects/${slug}/forms/${form.id}`;
  const inactive = form.status === "ARCHIVED" || !form.open;

  const handleCopyLink = React.useCallback(async () => {
    if (!hostedUrl) {
      toast.info("Publish this form to get a shareable link.");
      return;
    }
    try {
      await navigator.clipboard.writeText(`https://${hostedUrl}`);
      toast.success("Form link copied");
    } catch {
      toast.error("Couldn't copy. Try again.");
    }
  }, [hostedUrl]);

  const actions: ItemAction[] = [
    {
      id: "edit",
      label: "Edit",
      icon: PencilSimpleIcon,
      href: editHref,
      pinned: true,
    },
    {
      id: "link",
      label: "Copy link",
      icon: LinkSimpleIcon,
      onSelect: handleCopyLink,
      pinned: true,
    },
    {
      id: "toggle",
      label: form.open ? "Close" : "Open",
      icon: form.open ? EyeSlashIcon : EyeIcon,
      tone: form.open ? "warning" : "success",
      onSelect: onToggleOpen,
    },
    {
      id: "delete",
      label: "Delete",
      icon: TrashIcon,
      tone: "danger",
      iconOnly: true,
      pinned: true,
      onSelect: () => setDeleteOpen(true),
    },
  ];

  return (
    <ItemCard
      inactive={inactive}
      data-testid="form-card"
      aria-label={`${form.name} (${meta.label})`}
      className={cn(inactive && "border-dashed border-border/70")}
    >
      {/* ── Preview pane — real, scaled render; click to preview full-page ── */}
      <FormPreviewLauncher
        form={form}
        virtualWidth={720}
        inactive={inactive}
        className="aspect-[16/10] w-full"
      />

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col px-3.5 pb-3 pt-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <InlineName
              value={form.name}
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

        {/* Meta — intent · slug */}
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span
            className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded",
              meta.accent,
            )}
          >
            <Icon className="size-2.5" weight="bold" aria-hidden />
          </span>
          <span>{meta.label}</span>
          {form.slug && (
            <>
              <span className="text-border" aria-hidden>
                ·
              </span>
              <span className="truncate font-mono text-[10px] text-muted-foreground/80">
                /f/{form.slug}
              </span>
            </>
          )}
        </div>

        {/* KPI — publish version + last activity (single key line) */}
        <div className="mt-1.5 font-mono text-[11px] tabular-nums tracking-tight text-muted-foreground">
          {isPublished ? (
            <>
              <span className="font-semibold text-foreground">
                v{form.currentVersion}
              </span>{" "}
              <span className="text-border" aria-hidden>
                ·
              </span>{" "}
            </>
          ) : null}
          updated {timeAgo(new Date(form.updatedAt))}
        </div>

        {/* Action row pinned to bottom of card */}
        <ItemActionRow
          actions={actions}
          collapseUnder={340}
          visibleWhenCollapsed={2}
          className="mt-auto border-t border-border/60 pt-2"
        />
      </div>

      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        intent="danger"
        title={<>Delete &ldquo;{form.name}&rdquo;?</>}
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
    </ItemCard>
  );
});
