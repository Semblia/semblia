"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  PencilSimpleIcon,
  LinkSimpleIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowsOutSimpleIcon,
} from "@phosphor-icons/react";
import { timeAgo } from "@/lib/format";
import type { V2FormSummaryDTO } from "@workspace/types";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { InlineName } from "@/components/studio/inline-name";
import { ItemShell, ItemActionRow, type ItemAction } from "@/components/shared";
import { intentMeta } from "@/lib/forms/intents";
import { FormStatusBadge } from "./form-status-badge";
import { FormPreview } from "./form-preview";
import { FormPreviewDialog } from "./form-preview-dialog";

const HOSTED_BASE = "forms.semblia.com/f";

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
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const meta = intentMeta(form.intent);
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
      id: "preview",
      label: "Preview",
      icon: ArrowsOutSimpleIcon,
      onSelect: () => setPreviewOpen(true),
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
    <>
      {/* ponytail: uses ItemShell directly (not ItemRow) so the preview panel
          can bleed to the full row height without fighting the default padding. */}
      <ItemShell
        shape="row"
        inactive={inactive}
        aria-label={`${form.name} (${meta.label})`}
        className="overflow-hidden"
      >
        {/* Full-height left preview panel — a real, scaled render of the form,
            clickable to open the full-page preview. */}
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          aria-label={`Preview ${form.name}`}
          className="group/preview relative w-[140px] shrink-0 overflow-hidden border-r border-border/50 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
        >
          <FormPreview
            draft={form.draft}
            intent={form.intent}
            formId={form.id}
            projectId={form.projectId}
            slug={form.slug}
            virtualWidth={420}
            inactive={inactive}
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover/preview:opacity-100">
            <span className="rounded-md border border-foreground/15 bg-background/95 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-sm">
              Preview
            </span>
          </span>
        </button>

        {/* Content area */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0 px-5 py-3.5">
          {/* Main line: title + metrics + trailing */}
          <div className="flex w-full items-center gap-3">
            <div className="min-w-0 flex-1">
              <InlineName
                value={form.name}
                muted={inactive}
                dirty={false}
                onCommit={onRename}
              />
              <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {meta.label}
                </span>
                {form.slug && (
                  <>
                    <span className="text-border">·</span>
                    <span className="truncate font-mono text-[10px] text-muted-foreground/80">
                      /f/{form.slug}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Metrics — hidden on very small containers */}
            <div className="hidden font-mono text-[11px] tabular-nums tracking-tight text-muted-foreground/80 sm:flex sm:items-baseline sm:gap-1">
              {isPublished ? (
                <>
                  <span className="font-semibold text-foreground">
                    v{form.currentVersion}
                  </span>
                  <span>published</span>
                </>
              ) : (
                <span>Not published yet</span>
              )}
            </div>

            {/* Trailing: status + timestamp */}
            <div className="flex shrink-0 items-center gap-2">
              <FormStatusBadge status={form.status} open={form.open} />
              <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">
                {timeAgo(new Date(form.updatedAt))}
              </span>
            </div>
          </div>

          {/* Actions row */}
          <div className="mt-2 w-full">
            <ItemActionRow
              actions={actions}
              collapseUnder={380}
              visibleWhenCollapsed={2}
            />
          </div>
        </div>
      </ItemShell>

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

      <FormPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        form={form}
      />
    </>
  );
});
