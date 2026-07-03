"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  PencilSimpleIcon,
  LinkSimpleIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@phosphor-icons/react";
import { timeAgo } from "@/lib/format";
import { hostedFormLink } from "@/lib/semblia-urls";
import type { V2FormSummaryDTO } from "@workspace/types";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { InlineName } from "@/components/studio/inline-name";
import { ItemShell, ItemActionRow, type ItemAction } from "@/components/shared";
import { intentMeta } from "@/lib/forms/intents";
import { FormStatusBadge } from "./form-status-badge";
import { FormPreviewLauncher } from "./form-preview-launcher";

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
  const isPublished =
    form.status === "PUBLISHED" && form.currentVersion != null;
  const hostedLink = form.slug ? hostedFormLink(form.slug) : null;
  const editHref = `/projects/${slug}/forms/${form.id}`;
  const inactive = form.status === "ARCHIVED" || !form.open;

  const handleCopyLink = React.useCallback(async () => {
    if (!hostedLink) {
      toast.info("Publish this form to get a shareable link.");
      return;
    }
    try {
      await navigator.clipboard.writeText(hostedLink);
      toast.success("Form link copied");
    } catch {
      toast.error("Couldn't copy. Try again.");
    }
  }, [hostedLink]);

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
    <>
      {/* ponytail: uses ItemShell directly (not ItemRow) so the preview panel
          can bleed to the full row height without fighting the default padding. */}
      <ItemShell
        shape="row"
        inactive={inactive}
        aria-label={`${form.name} (${meta.label})`}
        className="overflow-hidden"
      >
        {/* Full-height left preview panel — real, scaled render; click to open
            the full-page preview. */}
        <FormPreviewLauncher
          form={form}
          virtualWidth={420}
          inactive={inactive}
          className="w-[140px] shrink-0 self-stretch border-r border-border/50"
        />

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
    </>
  );
});
