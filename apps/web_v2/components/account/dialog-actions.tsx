"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

// ── Dialog actions ─────────────────────────────────────────────────────────────

/**
 * Cancel + confirm footer shared by the account dialogs. The confirm button
 * swaps to `pendingLabel` while its action is in flight and is disabled while
 * the form is incomplete (`confirmDisabled`) or the action is already running.
 *
 * `reason` is how a disabled confirm explains itself. A disabled button takes
 * no pointer or focus events, so a tooltip on it is unreachable — the sentence
 * has to render in the flow, immediately above the control it describes, and
 * is wired to it with `aria-describedby`.
 */
export interface DialogActionsProps {
  onCancel: () => void;
  cancelDisabled?: boolean;
  onConfirm: () => void;
  confirmLabel: React.ReactNode;
  pendingLabel: React.ReactNode;
  pending: boolean;
  confirmDisabled?: boolean;
  /** Why the confirm can't be used right now. Rendered above the buttons. */
  reason?: React.ReactNode;
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
  reason,
  confirmVariant,
  confirmClassName,
}: DialogActionsProps) {
  const reasonId = React.useId();
  const showReason = Boolean(reason) && Boolean(confirmDisabled);

  return (
    <>
      {showReason && (
        <p id={reasonId} className="text-xs text-muted-foreground">
          {reason}
        </p>
      )}
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
          aria-describedby={showReason ? reasonId : undefined}
          onClick={onConfirm}
          className={confirmClassName}
        >
          {pending ? pendingLabel : confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}
