"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { PageHeader, PageBody, SettingsSection, ToggleRow } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
      <Card>
        <CardContent className="space-y-4 pt-0">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={submit}>
        <CardContent className="space-y-4 pt-0">
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
              <p className="text-xs text-destructive">Passwords don&apos;t match.</p>
            )}
          </div>
        </CardContent>

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
            Cancel
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
    </Card>
  );
}

// ── Security page ──────────────────────────────────────────────────────────────

export default function SecurityPage() {
  return (
    <>
      <PageHeader
        title="Security"
        description="Manage your password, two-factor authentication, and active sessions."
      />
      <PageBody padding="default" className="space-y-8 pb-24">
        <SettingsSection
          id="password"
          title="Password"
          description="Use a strong, unique password to protect your account."
          staggerIndex={0}
        >
          <PasswordSection />
        </SettingsSection>
      </PageBody>
    </>
  );
}
