"use client";

/**
 * The "Danger zone" settings section and the type-to-confirm dialog behind it.
 * Deleting an account is irreversible, so the confirm button stays disabled
 * until the exact phrase has been typed.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { TrashIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

import { signInPath } from "@/lib/routes";
import { SettingsSection } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogActions } from "@/components/account/dialog-actions";
import type { MaybeUserResource } from "@/components/account/clerk-user-types";

// ── Danger zone section ────────────────────────────────────────────────────────

interface DangerZoneSectionProps {
  onDelete: () => void;
}

export function DangerZoneSection({ onDelete }: DangerZoneSectionProps) {
  return (
    <SettingsSection
      id="danger"
      title="Danger zone"
      description="Irreversible actions that affect your account."
      staggerIndex={3}
      tone="danger"
      flush
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-destructive">Delete account</p>
          <p className="text-xs text-muted-foreground max-w-[42ch]">
            Permanently delete your account and all associated data. This cannot
            be undone.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="shrink-0 tactile"
          onClick={onDelete}
        >
          <TrashIcon className="size-3.5 mr-1" />
          Delete
        </Button>
      </div>
    </SettingsSection>
  );
}

// ── Delete account dialog ──────────────────────────────────────────────────────

interface DeleteAccountDialogProps {
  user: MaybeUserResource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmText: string;
  onConfirmTextChange: (value: string) => void;
}

export function DeleteAccountDialog({
  user,
  open,
  onOpenChange,
  confirmText,
  onConfirmTextChange,
}: DeleteAccountDialogProps) {
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);

  async function deleteAccount() {
    if (!user) return;
    setDeleting(true);
    try {
      await user.delete();
      router.push(signInPath());
    } catch {
      toast.error("Failed to delete account.");
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete account</DialogTitle>
          <DialogDescription>
            This will permanently delete your account and all associated data.
            Type{" "}
            <span className="font-mono font-medium text-destructive">
              delete my account
            </span>{" "}
            to confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor="delete-account-confirm" className="sr-only">
            Type &quot;delete my account&quot; to confirm
          </Label>
          <Input
            id="delete-account-confirm"
            value={confirmText}
            onChange={(e) => onConfirmTextChange(e.target.value)}
            placeholder="delete my account"
            autoComplete="off"
          />
        </div>

        <DialogActions
          onCancel={() => onOpenChange(false)}
          cancelDisabled={deleting}
          onConfirm={deleteAccount}
          confirmLabel="Delete account"
          pendingLabel="Deleting…"
          pending={deleting}
          confirmDisabled={
            confirmText.trim().toLowerCase() !== "delete my account"
          }
          confirmVariant="destructive"
          confirmClassName="min-w-[7rem]"
        />
      </DialogContent>
    </Dialog>
  );
}
