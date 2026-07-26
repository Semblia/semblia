"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  PageHeader,
  PageBody,
  SettingsSection,
  ToggleRow,
} from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  MfaSetupDialog,
  RegenBackupCodesDialog,
} from "@/components/account/mfa-setup-dialog";
import { SessionsList } from "@/components/account/sessions-list";

// ── Password section ───────────────────────────────────────────────────────────

function PasswordSection() {
  const { user, isLoaded } = useUser();

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [signOutOthers, setSignOutOthers] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const hasPassword = isLoaded && user?.passwordEnabled;
  const canSubmit =
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    (hasPassword ? currentPassword.length > 0 : true);

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSignOutOthers(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !canSubmit) return;
    setSaving(true);
    try {
      await user.updatePassword({
        ...(hasPassword ? { currentPassword } : {}),
        newPassword,
        signOutOfOtherSessions: signOutOthers,
      });
      toast.success(hasPassword ? "Password changed." : "Password set.");
      reset();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update password.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="overflow-hidden rounded-lg border border-border px-4 py-4 space-y-4">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <form onSubmit={submit}>
        <div className="space-y-4 px-4 py-4">
          {hasPassword && (
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="new-password">
              {hasPassword ? "New password" : "Password"}
            </Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Repeat password"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">
                Passwords don&apos;t match.
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-border">
          <ToggleRow
            title="Sign out other sessions"
            description="Sign out of all other active sessions when changing your password."
            checked={signOutOthers}
            onChange={setSignOutOthers}
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={saving}
            className="text-muted-foreground"
          >
            Discard
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!canSubmit || saving}
            className="min-w-[7rem] tactile"
          >
            {saving
              ? "Saving…"
              : hasPassword
                ? "Change password"
                : "Set password"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── MFA section ───────────────────────────────────────────────────────────────

function MfaSection() {
  const { user, isLoaded } = useUser();
  const [setupOpen, setSetupOpen] = React.useState(false);
  const [regenOpen, setRegenOpen] = React.useState(false);
  const [disableOpen, setDisableOpen] = React.useState(false);
  const [disabling, setDisabling] = React.useState(false);

  const totpEnabled = isLoaded && user?.twoFactorEnabled;

  async function disable() {
    if (!user) return;
    setDisabling(true);
    try {
      await user.disableTOTP();
      toast.success("Two-factor authentication disabled.");
    } catch {
      toast.error("Failed to disable two-factor authentication.");
    } finally {
      setDisabling(false);
      setDisableOpen(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="overflow-hidden rounded-lg border border-border flex items-center justify-between px-4 py-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                Authenticator app
              </span>
              {totpEnabled ? (
                <Badge variant="success" className="text-[10px]">
                  Enabled
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  Not set up
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {totpEnabled
                ? "Use your authenticator app to sign in."
                : "Add an extra layer of security with an authenticator app."}
            </p>
          </div>

          {totpEnabled ? (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRegenOpen(true)}
              >
                Regenerate codes
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDisableOpen(true)}
              >
                Disable
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => setSetupOpen(true)}
            >
              Set up
            </Button>
          )}
        </div>
      </div>

      <MfaSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onEnabled={() => toast.success("Two-factor authentication enabled.")}
      />

      <RegenBackupCodesDialog open={regenOpen} onOpenChange={setRegenOpen} />

      <ConfirmationDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        intent="warning"
        title="Disable two-factor authentication?"
        description="This will make your account less secure. You can re-enable it at any time."
        confirmLabel={disabling ? "Disabling…" : "Disable"}
        onConfirm={disable}
      />
    </>
  );
}

// ── Security page ──────────────────────────────────────────────────────────────

export default function SecurityPage() {
  return (
    <>
      <PageHeader title="Security" />
      <PageBody padding="default" withFooter className="space-y-8">
        <SettingsSection
          id="password"
          title="Password"
          description="Use a strong, unique password to protect your account."
          staggerIndex={0}
        >
          <PasswordSection />
        </SettingsSection>

        <SettingsSection
          id="mfa"
          title="Two-factor authentication"
          description="Require a second verification step when signing in."
          staggerIndex={1}
        >
          <MfaSection />
        </SettingsSection>

        <SettingsSection
          id="sessions"
          title="Active sessions"
          description="These devices are currently signed in to your account."
          staggerIndex={2}
        >
          <SessionsList />
        </SettingsSection>
      </PageBody>
    </>
  );
}
