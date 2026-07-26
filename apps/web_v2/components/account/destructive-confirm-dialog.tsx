"use client";

import * as React from "react";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { runWithToast } from "@/components/account/toast-action";

// ── Destructive confirm dialog ─────────────────────────────────────────────────

/**
 * One confirm-then-run wrapper for the account's destructive actions.
 *
 * The dialog is open for as long as there is a `target`, runs `action` against
 * that target once confirmed, reports the outcome with a toast, and always
 * closes afterwards. Call sites supply the copy and the action only.
 */
export interface DestructiveConfirmDialogProps<T> {
  /** The record the action applies to; `null` keeps the dialog closed. */
  target: T | null;
  onClose: () => void;
  intent: React.ComponentProps<typeof ConfirmationDialog>["intent"];
  title: React.ReactNode;
  description: React.ReactNode;
  confirmLabel: React.ReactNode;
  action: (target: T) => Promise<unknown>;
  successMessage: string;
  errorMessage: string;
}

export function DestructiveConfirmDialog<T>({
  target,
  onClose,
  intent,
  title,
  description,
  confirmLabel,
  action,
  successMessage,
  errorMessage,
}: DestructiveConfirmDialogProps<T>) {
  async function confirm() {
    if (!target) return;
    await runWithToast(() => action(target), {
      success: successMessage,
      error: errorMessage,
    });
    onClose();
  }

  return (
    <ConfirmationDialog
      open={!!target}
      onOpenChange={(o) => !o && onClose()}
      intent={intent}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      onConfirm={confirm}
    />
  );
}
