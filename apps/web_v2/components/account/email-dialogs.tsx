"use client";

/**
 * The two steps behind "Add email": collect the address, then verify the code
 * Clerk mails to it. Both dialogs are rendered by the profile page, so the
 * verify step outlives the add step that hands off to it.
 */

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { DialogActions } from "@/components/account/dialog-actions";
import type { EmailAddressResource } from "@/components/account/clerk-user-types";

// ── Add email dialog ───────────────────────────────────────────────────────────

interface AddEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (email: EmailAddressResource) => void;
}

export function AddEmailDialog({
  open,
  onOpenChange,
  onAdded,
}: AddEmailDialogProps) {
  const { user } = useUser();
  const [email, setEmail] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  React.useEffect(() => {
    if (open) setEmail("");
  }, [open]);

  async function add() {
    if (!user || !email.trim()) return;
    setAdding(true);
    try {
      const addr = await user.createEmailAddress({ email: email.trim() });
      onAdded(addr);
      onOpenChange(false);
    } catch {
      toast.error("Failed to add email address.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add email address</DialogTitle>
          <DialogDescription>
            We&apos;ll send a verification code to confirm ownership.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor="new-email">Email</Label>
          <Input
            id="new-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
        </div>

        <DialogActions
          onCancel={() => onOpenChange(false)}
          onConfirm={add}
          confirmLabel="Add email"
          pendingLabel="Adding…"
          pending={adding}
          confirmDisabled={!email.trim()}
        />
      </DialogContent>
    </Dialog>
  );
}

// ── Email verification ─────────────────────────────────────────────────────────

// Sending the code and attempting it are the dialog's whole state machine;
// keeping them here leaves the dialog itself presentational.
function useEmailVerification(
  emailAddress: EmailAddressResource | null,
  open: boolean,
  onVerified: () => void,
  onOpenChange: (open: boolean) => void,
) {
  const [code, setCode] = React.useState("");
  const [verifying, setVerifying] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [sendFailed, setSendFailed] = React.useState(false);

  // "Sending" and "failed to send" are different states. Without the second
  // one a failed send leaves the dialog on its skeleton forever, with a toast
  // the user cannot act on and no way to retry.
  function sendCode() {
    if (!emailAddress) return;
    setSent(false);
    setSendFailed(false);
    setCode("");
    emailAddress
      .prepareVerification({ strategy: "email_code" })
      .then(() => setSent(true))
      .catch(() => {
        setSendFailed(true);
        toast.error("Failed to send verification code.");
      });
  }

  React.useEffect(() => {
    // `sendCode` already no-ops without an address, so `open` is the only gate.
    if (open) sendCode();
  }, [open, emailAddress?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function verify() {
    if (!emailAddress || code.length < 6) return;
    setVerifying(true);
    try {
      await emailAddress.attemptVerification({ code });
      toast.success("Email verified.");
      onVerified();
      onOpenChange(false);
    } catch {
      toast.error("Invalid code. Try again.");
    } finally {
      setVerifying(false);
      setCode("");
    }
  }

  return { code, setCode, sent, sendFailed, verifying, sendCode, verify };
}

// ── Email verification dialog ──────────────────────────────────────────────────

interface VerifyEmailDialogProps {
  emailAddress: EmailAddressResource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

export function VerifyEmailDialog({
  emailAddress,
  open,
  onOpenChange,
  onVerified,
}: VerifyEmailDialogProps) {
  const { code, setCode, sent, sendFailed, verifying, sendCode, verify } =
    useEmailVerification(emailAddress, open, onVerified, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Verify email address</DialogTitle>
          <DialogDescription>
            Enter the 6-digit code sent to{" "}
            <span className="font-medium text-foreground">
              {emailAddress?.emailAddress}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <VerifyCodeField
            sent={sent}
            sendFailed={sendFailed}
            code={code}
            onChange={setCode}
            onComplete={verify}
            onRetry={sendCode}
          />
        </div>

        <DialogActions
          onCancel={() => onOpenChange(false)}
          onConfirm={verify}
          confirmLabel="Verify"
          pendingLabel="Verifying…"
          pending={verifying}
          confirmDisabled={code.length < 6 || !sent}
        />
      </DialogContent>
    </Dialog>
  );
}

// ── Verification code field ────────────────────────────────────────────────────

interface VerifyCodeFieldProps {
  sent: boolean;
  sendFailed: boolean;
  code: string;
  onChange: (code: string) => void;
  onComplete: () => void;
  onRetry: () => void;
}

// The body of the verify dialog, in the send's three states: failed to send,
// still sending, or ready for the code.
function VerifyCodeField({
  sent,
  sendFailed,
  code,
  onChange,
  onComplete,
  onRetry,
}: VerifyCodeFieldProps) {
  if (sendFailed) return <SendFailedNotice onRetry={onRetry} />;
  if (!sent) return <Skeleton className="h-10 w-48 rounded-md" />;

  return (
    <InputOTP
      maxLength={6}
      value={code}
      onChange={onChange}
      onComplete={onComplete}
    >
      <InputOTPGroup>
        {Array.from({ length: 6 }, (_, i) => (
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}

function SendFailedNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-xs text-destructive">
        We couldn&apos;t send a code to that address.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
