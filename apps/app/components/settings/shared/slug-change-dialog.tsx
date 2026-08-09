"use client";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export interface SlugChangeDialogProps {
  open: boolean;
  oldSlug: string;
  newSlug: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SlugChangeDialog({
  open,
  oldSlug,
  newSlug,
  onConfirm,
  onCancel,
}: SlugChangeDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
      intent="warning"
      title="Change project slug?"
      description={
        <>
          Changing from <code className="font-mono text-xs">{oldSlug}</code> to{" "}
          <code className="font-mono text-xs">{newSlug}</code> will break
          existing links. Embedded widgets keep working.
        </>
      }
      confirmLabel="Change slug"
      cancelLabel="Keep current"
      onConfirm={onConfirm}
    />
  );
}
