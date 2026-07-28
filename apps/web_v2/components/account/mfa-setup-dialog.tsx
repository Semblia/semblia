"use client";

/**
 * Two-factor setup, in three steps, each of which can fail on its own.
 *
 * The old build had one loading flag and no failure state anywhere:
 *
 *   • `createTOTP()` failing left the dialog on its skeleton forever, with a
 *     toast the user could no longer act on and nothing to retry
 *   • a rejected code cleared the field and returned the step to its idle
 *     appearance — a failed verification looked exactly like a pending one
 *   • Clerk returning no backup codes rendered an empty grid under a "Done"
 *     button, so the user left believing they had codes they did not have
 *
 * Every step now separates pending, failed, and ready, and each failure names
 * what failed and offers the one recovery that can actually work.
 *
 * The panels inside are tint steps, not bordered boxes: a dialog is already a
 * bounded surface, and a bordered box inside one is the nesting defect.
 */

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { QRCodeCanvas } from "qrcode.react";
import { WarningCircleIcon } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/ui/copy-button";

// ── Types derived from Clerk ───────────────────────────────────────────────────

type TOTPResource =
  NonNullable<ReturnType<typeof useUser>["user"]> extends {
    createTOTP: () => Promise<infer T>;
  }
    ? T
    : never;

/** Every async step in this dialog resolves to exactly one of these. */
type StepState = "pending" | "ready" | "failed";

const BACKUP_CODES_FILENAME = "semblia-backup-codes.txt";

// ── Shared step failure ────────────────────────────────────────────────────────

/**
 * A step that did not complete. Names the resource, offers the single recovery
 * that can succeed, and never reads as "still working" — which is the whole
 * reason it exists.
 */
function StepFailure({
  title,
  description,
  onRetry,
  retryLabel = "Try again",
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 py-6 text-center"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <WarningCircleIcon className="size-5" weight="bold" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-1" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

function downloadCodes(codesText: string) {
  const blob = new Blob([codesText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = BACKUP_CODES_FILENAME;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Step 1: Show QR / secret ───────────────────────────────────────────────────

function SecretStep({
  totp,
  onNext,
}: {
  totp: TOTPResource;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5 py-2">
      <p className="text-sm text-muted-foreground">
        Open your authenticator app (Google Authenticator, Authy, 1Password) and
        scan the QR code, or enter the setup key by hand.
      </p>

      {totp.uri ? (
        <div className="flex justify-center">
          {/* White stays: scanners need the contrast. No border — the dialog is
              already the bounded surface. */}
          <div className="rounded-lg bg-white p-3">
            <QRCodeCanvas
              value={totp.uri}
              size={160}
              level="M"
              marginSize={0}
              fgColor="#000000"
              bgColor="#ffffff"
              title="QR code for two-factor authenticator setup"
            />
          </div>
        </div>
      ) : (
        // Clerk can return a secret with no otpauth URI. The key below still
        // works, so say that rather than leaving a gap where a code should be.
        <p className="text-xs text-muted-foreground">
          No QR code was returned for this account — enter the setup key below
          in your authenticator app instead.
        </p>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Setup key</p>
        <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
          <code className="flex-1 select-all break-all font-mono text-xs text-foreground">
            {totp.secret}
          </code>
          <CopyButton value={totp.secret ?? ""} className="size-6 shrink-0" />
        </div>
      </div>

      <DialogFooter>
        <Button size="sm" onClick={onNext} className="min-w-[7rem] tactile">
          Enter code
        </Button>
      </DialogFooter>
    </div>
  );
}

// ── Step 2: Verify code ────────────────────────────────────────────────────────

function VerifyStep({
  onVerified,
  onBack,
}: {
  onVerified: (backupCodes: string[]) => void;
  onBack: () => void;
}) {
  const { user } = useUser();
  const [code, setCode] = React.useState("");
  const [status, setStatus] = React.useState<StepState>("ready");
  const verifying = status === "pending";

  async function verify() {
    if (!user || code.length < 6) return;
    setStatus("pending");
    try {
      const result = await user.verifyTOTP({ code });
      onVerified(result.backupCodes ?? []);
    } catch {
      // A rejected code is a *state*, not a transient toast: the field stays
      // where the user is looking and says what to do about it.
      setStatus("failed");
      setCode("");
    }
  }

  return (
    <div className="space-y-5 py-2">
      <p className="text-sm text-muted-foreground">
        Enter the 6-digit code your authenticator app is showing right now.
      </p>

      <div className="flex flex-col items-center gap-2">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={(next) => {
            setCode(next);
            if (status === "failed") setStatus("ready");
          }}
          onComplete={verify}
          aria-invalid={status === "failed"}
          aria-describedby={status === "failed" ? "totp-error" : undefined}
        >
          <InputOTPGroup>
            {Array.from({ length: 6 }, (_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>

        {status === "failed" && (
          <p
            id="totp-error"
            role="alert"
            className="text-xs leading-relaxed text-destructive"
          >
            That code didn&apos;t match. Codes change every 30 seconds — enter
            the one showing now.
          </p>
        )}
      </div>

      <DialogFooter className="gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={verifying}>
          Back to setup key
        </Button>
        <Button
          size="sm"
          disabled={code.length < 6 || verifying}
          onClick={verify}
          className="min-w-[7rem] tactile"
        >
          {verifying ? "Verifying…" : "Verify code"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ── Step 3: Backup codes ───────────────────────────────────────────────────────

function BackupCodesStep({
  codes,
  onDone,
}: {
  codes: string[];
  onDone: () => void;
}) {
  const codesText = codes.join("\n");

  // Two-factor is already on at this point; the codes just didn't come back.
  // Pretending otherwise would send the owner away thinking they are covered.
  if (codes.length === 0) {
    return (
      <div className="space-y-4 py-2">
        <StepFailure
          title="No backup codes were returned"
          description="Two-factor authentication is on, but this account has no backup codes yet. Generate a set from Security before you risk losing your authenticator."
        />
        <DialogFooter>
          <Button size="sm" onClick={onDone} className="min-w-[7rem]">
            Close
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <p className="rounded-md bg-warning/10 px-3 py-2.5 text-[13px] leading-relaxed text-warning">
        Save these now. Each code works once, and they are the only way back in
        if you lose your authenticator app.
      </p>

      <BackupCodeGrid codes={codes} />

      <div className="flex items-center gap-2">
        <CopyButton value={codesText} className="h-8 px-3 text-xs" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCodes(codesText)}
        >
          Download codes
        </Button>
      </div>

      <DialogFooter>
        <Button size="sm" onClick={onDone} className="min-w-[7rem] tactile">
          Finish setup
        </Button>
      </DialogFooter>
    </div>
  );
}

function BackupCodeGrid({ codes }: { codes: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 rounded-md bg-muted/40 p-3">
      {codes.map((code) => (
        <code key={code} className="font-mono text-xs text-foreground">
          {code}
        </code>
      ))}
    </div>
  );
}

// ── Main dialog ────────────────────────────────────────────────────────────────

export interface MfaSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnabled: () => void;
}

export function MfaSetupDialog({
  open,
  onOpenChange,
  onEnabled,
}: MfaSetupDialogProps) {
  const { user } = useUser();
  const [step, setStep] = React.useState<"secret" | "verify" | "backup">(
    "secret",
  );
  const [totp, setTotp] = React.useState<TOTPResource | null>(null);
  const [backupCodes, setBackupCodes] = React.useState<string[]>([]);
  const [secretStatus, setSecretStatus] = React.useState<StepState>("pending");

  const createSecret = React.useCallback(() => {
    if (!user) return;
    setSecretStatus("pending");
    setTotp(null);
    user
      .createTOTP()
      .then((resource) => {
        setTotp(resource);
        setSecretStatus("ready");
      })
      .catch(() => setSecretStatus("failed"));
  }, [user]);

  React.useEffect(() => {
    if (!open) return;
    setStep("secret");
    setBackupCodes([]);
    createSecret();
  }, [open, createSecret]);

  const stepLabels = { secret: "1 of 3", verify: "2 of 3", backup: "3 of 3" };
  const stepTitles = {
    secret: "Set up authenticator",
    verify: "Confirm code",
    backup: "Save backup codes",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>{stepTitles[step]}</DialogTitle>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {stepLabels[step]}
            </span>
          </div>
          <DialogDescription>
            Two-factor authentication adds a second step to every sign-in.
          </DialogDescription>
        </DialogHeader>

        <SetupBody
          step={step}
          secretStatus={secretStatus}
          totp={totp}
          backupCodes={backupCodes}
          onRetrySecret={createSecret}
          onNext={() => setStep("verify")}
          onBack={() => setStep("secret")}
          onVerified={(codes) => {
            setBackupCodes(codes);
            setStep("backup");
          }}
          onDone={() => {
            onEnabled();
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Which step body to show. The first step's failure is separate from its
 * pending state, so "we couldn't start setup" no longer wears a skeleton.
 */
function SetupBody({
  step,
  secretStatus,
  totp,
  backupCodes,
  onRetrySecret,
  onNext,
  onBack,
  onVerified,
  onDone,
}: {
  step: "secret" | "verify" | "backup";
  secretStatus: StepState;
  totp: TOTPResource | null;
  backupCodes: string[];
  onRetrySecret: () => void;
  onNext: () => void;
  onBack: () => void;
  onVerified: (codes: string[]) => void;
  onDone: () => void;
}) {
  if (step === "verify") {
    return <VerifyStep onBack={onBack} onVerified={onVerified} />;
  }
  if (step === "backup") {
    return <BackupCodesStep codes={backupCodes} onDone={onDone} />;
  }
  if (secretStatus === "failed") {
    return (
      <StepFailure
        title="Couldn't start authenticator setup"
        description="The request to create a setup key didn't complete. Nothing has changed on your account."
        onRetry={onRetrySecret}
      />
    );
  }
  if (secretStatus === "pending" || !totp) {
    return <SecretSkeleton />;
  }
  return <SecretStep totp={totp} onNext={onNext} />;
}

// Matches the real step: QR block, then the setup-key row.
function SecretSkeleton() {
  return (
    <div aria-hidden className="space-y-3 py-4">
      <Skeleton className="mx-auto size-40 rounded-lg" />
      <Skeleton className="h-8 w-full rounded-md" />
    </div>
  );
}

// ── Regen backup codes dialog ──────────────────────────────────────────────────

export interface RegenBackupCodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegenBackupCodesDialog({
  open,
  onOpenChange,
}: RegenBackupCodesDialogProps) {
  const { user } = useUser();
  const [codes, setCodes] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<StepState>("pending");

  const generate = React.useCallback(() => {
    if (!user) return;
    setStatus("pending");
    setCodes([]);
    user
      .createBackupCode()
      .then((result) => {
        setCodes(result.codes ?? []);
        setStatus("ready");
      })
      .catch(() => setStatus("failed"));
  }, [user]);

  React.useEffect(() => {
    if (open) generate();
  }, [open, generate]);

  const codesText = codes.join("\n");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New backup codes</DialogTitle>
          <DialogDescription>
            Generating a new set invalidates the previous one. Save these before
            closing.
          </DialogDescription>
        </DialogHeader>

        {status === "failed" ? (
          // A failed generation is its own state: the old codes are still
          // valid, which is the fact the owner needs before they retry.
          <StepFailure
            title="Couldn't generate backup codes"
            description="The request didn't complete, so your existing codes are still valid."
            onRetry={generate}
          />
        ) : status === "pending" ? (
          <div aria-hidden className="grid grid-cols-2 gap-1.5 py-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-5 w-full rounded" />
            ))}
          </div>
        ) : codes.length === 0 ? (
          <StepFailure
            title="No codes were returned"
            description="The request completed without any codes. Your existing codes are still valid — try generating a new set again."
            onRetry={generate}
          />
        ) : (
          <div className="space-y-4 py-2">
            <BackupCodeGrid codes={codes} />

            <div className="flex items-center gap-2">
              <CopyButton value={codesText} className="h-8 px-3 text-xs" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCodes(codesText)}
              >
                Download codes
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            size="sm"
            variant={codes.length === 0 ? "outline" : "default"}
            onClick={() => onOpenChange(false)}
            className="min-w-[5rem]"
          >
            {codes.length === 0 ? "Close" : "Done"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
