"use client";

/**
 * The two steps behind "Add email": collect the address, then verify the code
 * Clerk mails to it. Both dialogs are rendered by the profile page, so the
 * verify step outlives the add step that hands off to it.
 *
 * Every failure here is a state on the surface, not just a toast. A toast is
 * gone in four seconds and cannot be acted on; these dialogs are where the user
 * is looking, so "we couldn't send the code" and "that code didn't match" say
 * so in place and offer the recovery that works.
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
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setEmail("");
      setFailed(false);
    }
  }, [open]);

  async function add() {
    if (!user || !email.trim()) return;
    setAdding(true);
    setFailed(false);
    try {
      const addr = await user.createEmailAddress({ email: email.trim() });
      onAdded(addr);
      onOpenChange(false);
    } catch {
      // Stays on screen with the typed address intact, so the correction is one
      // edit away rather than a re-type after a vanished toast.
      setFailed(true);
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
            We&apos;ll send a verification code to confirm you own it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor="new-email">Email</Label>
          <Input
            id="new-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (failed) setFailed(false);
            }}
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={failed}
            aria-describedby={failed ? "add-email-error" : undefined}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          {failed && (
            <p
              id="add-email-error"
              role="alert"
              className="text-xs leading-relaxed text-destructive"
            >
              Couldn&apos;t add that address. It may already be on an account,
              or the domain may not accept mail.
            </p>
          )}
        </div>

        <DialogActions
          onCancel={() => onOpenChange(false)}
          onConfirm={add}
          confirmLabel="Add email"
          pendingLabel="Adding…"
          pending={adding}
          confirmDisabled={!email.trim()}
          reason="Enter an email address to add."
        />
      </DialogContent>
    </Dialog>
  );
}

// ── Email verification ─────────────────────────────────────────────────────────

/** Where the emailed code currently stands. */
type SendState = "sending" | "sent" | "failed";

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
  const [sendState, setSendState] = React.useState<SendState>("sending");
  const [codeRejected, setCodeRejected] = React.useState(false);

  // "Sending" and "failed to send" are different states. Without the second
  // one a failed send leaves the dialog on its skeleton forever, with a toast
  // the user cannot act on and no way to retry.
  function sendCode() {
    if (!emailAddress) return;
    setSendState("sending");
    setCodeRejected(false);
    setCode("");
    emailAddress
      .prepareVerification({ strategy: "email_code" })
      .then(() => setSendState("sent"))
      .catch(() => setSendState("failed"));
  }

  React.useEffect(() => {
    // `sendCode` already no-ops without an address, so `open` is the only gate.
    if (open) sendCode();
  }, [open, emailAddress?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function verify() {
    if (!emailAddress || code.length < 6) return;
    setVerifying(true);
    setCodeRejected(false);
    try {
      await emailAddress.attemptVerification({ code });
      toast.success("Email verified.");
      onVerified();
      onOpenChange(false);
    } catch {
      // A rejected code is a state on the field, not a disappearing toast.
      setCodeRejected(true);
      setCode("");
    } finally {
      setVerifying(false);
    }
  }

  const clearRejection = () => setCodeRejected(false);

  return {
    code,
    setCode,
    sendState,
    codeRejected,
    clearRejection,
    verifying,
    sendCode,
    verify,
  };
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
  const {
    code,
    setCode,
    sendState,
    codeRejected,
    clearRejection,
    verifying,
    sendCode,
    verify,
  } = useEmailVerification(emailAddress, open, onVerified, onOpenChange);

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
            sendState={sendState}
            codeRejected={codeRejected}
            code={code}
            onChange={(next) => {
              setCode(next);
              clearRejection();
            }}
            onComplete={verify}
            onRetry={sendCode}
          />
        </div>

        <DialogActions
          onCancel={() => onOpenChange(false)}
          onConfirm={verify}
          confirmLabel="Verify address"
          pendingLabel="Verifying…"
          pending={verifying}
          confirmDisabled={code.length < 6 || sendState !== "sent"}
          reason={
            sendState === "failed"
              ? "Send the code again before verifying."
              : sendState === "sending"
                ? "Waiting for the code to be sent."
                : "Enter all six digits to verify."
          }
        />
      </DialogContent>
    </Dialog>
  );
}

// ── Verification code field ────────────────────────────────────────────────────

interface VerifyCodeFieldProps {
  sendState: SendState;
  codeRejected: boolean;
  code: string;
  onChange: (code: string) => void;
  onComplete: () => void;
  onRetry: () => void;
}

// The body of the verify dialog, in the send's three states: failed to send,
// still sending, or ready for the code — plus the rejected-code state on top of
// the last one, which must never look like the idle field it replaces.
function VerifyCodeField({
  sendState,
  codeRejected,
  code,
  onChange,
  onComplete,
  onRetry,
}: VerifyCodeFieldProps) {
  if (sendState === "failed") return <SendFailedNotice onRetry={onRetry} />;
  if (sendState === "sending")
    return <Skeleton className="h-10 w-48 rounded-md" />;

  return (
    <div className="flex flex-col items-center gap-2">
      <InputOTP
        maxLength={6}
        value={code}
        onChange={onChange}
        onComplete={onComplete}
        aria-invalid={codeRejected}
        aria-describedby={codeRejected ? "email-code-error" : undefined}
      >
        <InputOTPGroup>
          {Array.from({ length: 6 }, (_, i) => (
            <InputOTPSlot key={i} index={i} />
          ))}
        </InputOTPGroup>
      </InputOTP>

      {codeRejected && (
        <p
          id="email-code-error"
          role="alert"
          className="max-w-xs text-center text-xs leading-relaxed text-destructive"
        >
          That code didn&apos;t match. Check the latest email — an earlier code
          stops working once a new one is sent.
        </p>
      )}
    </div>
  );
}

function SendFailedNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 text-center">
      <p className="text-xs leading-relaxed text-destructive">
        Couldn&apos;t send a code to that address.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Send code again
      </Button>
    </div>
  );
}
