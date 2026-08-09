"use client";

/**
 * The secret a rotation produces, shown once.
 *
 * Rotating from the list used to call the mutation and throw the response away:
 * the old secret stopped working, the new one was never displayed, and it can
 * never be fetched again — the API stores a hash. The row offered a one-way
 * action that silently destroyed the credential.
 *
 * Rotation now surfaces the new secret wherever it is triggered, through the
 * same guarded reveal the create flow uses, and dismissing it asks first.
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ConfirmCloseDialog,
  RevealStep,
} from "@/components/developers/shared/reveal-step";

export function RotatedKeyDialog({
  plaintext,
  onDismiss,
}: {
  /** The new secret, held only in the caller's state. `null` closes the flow. */
  plaintext: string | null;
  /** Clear the caller's state and reset the mutation that produced it. */
  onDismiss: () => void;
}) {
  const [confirming, setConfirming] = React.useState(false);

  return (
    <>
      <Dialog
        open={plaintext != null}
        onOpenChange={(open) => {
          // Escape and the scrim both route through the guard: this is the only
          // moment the secret exists anywhere the user can read it.
          if (!open) setConfirming(true);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Key rotated</DialogTitle>
            <DialogDescription>
              The previous secret stopped working immediately. This replacement
              is shown once and cannot be retrieved later.
            </DialogDescription>
          </DialogHeader>
          {plaintext != null && (
            <RevealStep plaintext={plaintext} onClose={onDismiss} />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmCloseDialog
        open={confirming}
        onOpenChange={setConfirming}
        onConfirm={() => {
          setConfirming(false);
          onDismiss();
        }}
      />
    </>
  );
}
