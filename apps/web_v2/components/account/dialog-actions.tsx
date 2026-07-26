"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

// ── Dialog actions ─────────────────────────────────────────────────────────────

/**
 * Cancel + confirm footer shared by the account dialogs. The confirm button
 * swaps to `pendingLabel` while its action is in flight and is disabled while
 * the form is incomplete (`confirmDisabled`) or the action is already running.
 */
export interface DialogActionsProps {
  onCancel: () => void;
  cancelDisabled?: boolean;
  onConfirm: () => void;
  confirmLabel: React.ReactNode;
  pendingLabel: React.ReactNode;
  pending: boolean;
  confirmDisabled?: boolean;
  confirmVariant?: React.ComponentProps<typeof Button>["variant"];
  confirmClassName?: string;
}

export function DialogActions({
  onCancel,
  cancelDisabled,
  onConfirm,
  confirmLabel,
  pendingLabel,
  pending,
  confirmDisabled,
  confirmVariant,
  confirmClassName,
}: DialogActionsProps) {
  return (
    <DialogFooter>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        disabled={cancelDisabled}
      >
        Cancel
      </Button>
      <Button
        variant={confirmVariant}
        size="sm"
        disabled={confirmDisabled || pending}
        onClick={onConfirm}
        className={confirmClassName}
      >
        {pending ? pendingLabel : confirmLabel}
      </Button>
    </DialogFooter>
  );
}
