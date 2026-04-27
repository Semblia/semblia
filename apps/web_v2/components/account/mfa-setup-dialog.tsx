"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";

// ── Types derived from Clerk ───────────────────────────────────────────────────

type TOTPResource = NonNullable<
  ReturnType<typeof useUser>["user"]
> extends { createTOTP: () => Promise<infer T> }
  ? T
  : never;

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
        Open your authenticator app (e.g. Google Authenticator, Authy) and
        scan the QR code, or enter the setup key manually.
      </p>

      {totp.uri && (
        <div className="flex flex-col items-center gap-3">
          {/* QR placeholder — shows the URI as a tappable link */}
          <a
            href={totp.uri}
            className="flex h-40 w-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-center text-[11px] text-muted-foreground hover:bg-muted/60 transition-colors p-3"
          >
            Tap to open in authenticator app
          </a>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Setup key</p>
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
          <code className="flex-1 select-all break-all font-mono text-xs text-foreground">
            {totp.secret}
          </code>
          <CopyButton value={totp.secret ?? ""} className="size-6 shrink-0" />
        </div>
      </div>

      <DialogFooter>
        <Button size="sm" onClick={onNext} className="min-w-[7rem] tactile">
          Next
        </Button>
      </DialogFooter>
    </div>
  );
}

// ── Step 2: Verify code ────────────────────────────────────────────────────────

function VerifyStep({
  totp,
  onVerified,
  onBack,
}: {
  totp: TOTPResource;
  onVerified: (backupCodes: string[]) => void;
  onBack: () => void;
}) {
  const { user } = useUser();
  const [code, setCode] = React.useState("");
  const [verifying, setVerifying] = React.useState(false);

  async function verify() {
    if (!user || code.length < 6) return;
    setVerifying(true);
    try {
      const result = await user.verifyTOTP({ code });
      onVerified(result.backupCodes ?? []);
    } catch {
      toast.error("Invalid code. Check your authenticator app.");
    } finally {
      setVerifying(false);
      setCode("");
    }
  }

  return (
    <div className="space-y-5 py-2">
      <p className="text-sm text-muted-foreground">
        Enter the 6-digit code from your authenticator app to verify setup.
      </p>

      <div className="flex justify-center">
        <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={verify}>
          <InputOTPGroup>
            {Array.from({ length: 6 }, (_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      <DialogFooter className="gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={verifying}>
          Back
        </Button>
        <Button
          size="sm"
          disabled={code.length < 6 || verifying}
          onClick={verify}
          className="min-w-[7rem] tactile"
        >
          {verifying ? "Verifying…" : "Verify"}
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

  function download() {
    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tresta-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 py-2">
      <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5 text-[13px] text-warning">
        Save these backup codes. Each can only be used once if you lose access
        to your authenticator app.
      </div>

      <div className="grid grid-cols-2 gap-1.5 rounded-md border border-border bg-muted/30 p-3">
        {codes.map((c) => (
          <code key={c} className="font-mono text-xs text-foreground">
            {c}
          </code>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <CopyButton value={codesText} className="h-8 px-3 text-xs" />
        <Button variant="outline" size="sm" onClick={download}>
          Download
        </Button>
      </div>

      <DialogFooter>
        <Button size="sm" onClick={onDone} className="min-w-[7rem] tactile">
          Done
        </Button>
      </DialogFooter>
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
  const [step, setStep] = React.useState<"secret" | "verify" | "backup">("secret");
  const [totp, setTotp] = React.useState<TOTPResource | null>(null);
  const [backupCodes, setBackupCodes] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setStep("secret");
      setTotp(null);
      setBackupCodes([]);
      if (user) {
        setLoading(true);
        user
          .createTOTP()
          .then((t) => setTotp(t))
          .catch(() => toast.error("Failed to initialize MFA setup."))
          .finally(() => setLoading(false));
      }
    }
  }, [open, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <div className="flex items-center justify-between">
            <DialogTitle>{stepTitles[step]}</DialogTitle>
            <span className="text-xs text-muted-foreground tabular-nums">
              {stepLabels[step]}
            </span>
          </div>
          <DialogDescription>
            Two-factor authentication adds an extra layer of security.
          </DialogDescription>
        </DialogHeader>

        {loading || !totp ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-40 w-40 mx-auto rounded-lg" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        ) : step === "secret" ? (
          <SecretStep totp={totp} onNext={() => setStep("verify")} />
        ) : step === "verify" ? (
          <VerifyStep
            totp={totp}
            onBack={() => setStep("secret")}
            onVerified={(codes) => {
              setBackupCodes(codes);
              setStep("backup");
            }}
          />
        ) : (
          <BackupCodesStep
            codes={backupCodes}
            onDone={() => {
              onEnabled();
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
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
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open && user) {
      setLoading(true);
      setCodes([]);
      user
        .createBackupCode()
        .then((r) => setCodes(r.codes))
        .catch(() => toast.error("Failed to generate backup codes."))
        .finally(() => setLoading(false));
    }
  }, [open, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const codesText = codes.join("\n");

  function download() {
    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tresta-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New backup codes</DialogTitle>
          <DialogDescription>
            Your previous backup codes have been invalidated. Save these new
            ones.
          </DialogDescription>
        </DialogHeader>

        {loading || codes.length === 0 ? (
          <div className="grid grid-cols-2 gap-1.5 py-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-5 w-full rounded" />
            ))}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-1.5 rounded-md border border-border bg-muted/30 p-3">
              {codes.map((c) => (
                <code key={c} className="font-mono text-xs text-foreground">
                  {c}
                </code>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <CopyButton value={codesText} className="h-8 px-3 text-xs" />
              <Button variant="outline" size="sm" onClick={download}>
                Download
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            size="sm"
            disabled={loading || codes.length === 0}
            onClick={() => onOpenChange(false)}
            className={cn("min-w-[5rem]", loading && "opacity-50")}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
