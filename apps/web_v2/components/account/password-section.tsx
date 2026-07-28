"use client";

/**
 * The "Password" settings section.
 *
 * Previously this drew its own `rounded-lg border` *inside* `SettingsSection` —
 * a card inside a card — and skeletonised itself with a hand-written
 * `!isLoaded ?` ladder. Now the fieldset is the only bounded surface, the
 * groups inside it are separated by hairlines, and `DataState` owns the ladder.
 *
 * The submit control also stops being bare-disabled: whatever is currently
 * blocking the save is named beside it, because a disabled button takes no
 * pointer events and so can never explain itself through a tooltip.
 */

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

import { DataState, SettingsSection, ToggleRow } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useClerkDataState } from "@/components/account/use-clerk-data-state";

const MIN_LENGTH = 8;

export function PasswordSection() {
  const { user, isLoaded } = useUser();
  const state = useClerkDataState(user, isLoaded);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [signOutOthers, setSignOutOthers] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const hasPassword = Boolean(user?.passwordEnabled);
  const blockedBy = submitBlockedBy({
    hasPassword,
    currentPassword,
    newPassword,
    confirmPassword,
  });

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSignOutOthers(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || blockedBy) return;
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

  return (
    <SettingsSection
      id="password"
      title="Password"
      description="Use a strong, unique password. Changing it can also end every other session on your account."
      staggerIndex={0}
      flush
    >
      <DataState
        state={state}
        resource="your sign-in settings"
        align="start"
        compactError
        skeleton={<PasswordSkeleton />}
      >
        <form onSubmit={submit}>
          <div className="space-y-4 px-5 py-5">
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
                placeholder={`At least ${MIN_LENGTH} characters`}
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
            </div>
          </div>

          {/* Hairline, not a second card — the grouping ladder inside a bounded
              region stops at a divider. */}
          <div className="border-t border-border/60">
            <ToggleRow
              title="Sign out other sessions"
              description="End every other active session when this password changes."
              checked={signOutOthers}
              onChange={setSignOutOthers}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
            <p
              id="password-submit-reason"
              className="min-w-0 text-xs text-muted-foreground"
            >
              {blockedBy ?? ""}
            </p>
            <div className="flex shrink-0 items-center gap-2">
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
                disabled={Boolean(blockedBy) || saving}
                aria-describedby={
                  blockedBy ? "password-submit-reason" : undefined
                }
                className="min-w-[7rem] tactile"
              >
                {saving
                  ? "Saving…"
                  : hasPassword
                    ? "Change password"
                    : "Set password"}
              </Button>
            </div>
          </div>
        </form>
      </DataState>
    </SettingsSection>
  );
}

/**
 * The single reason the save is unavailable right now, in the order the user
 * meets the fields. Returning `null` means the form is submittable — there is
 * one source of truth for the disabled state and for the sentence explaining
 * it, so the two can never disagree.
 */
function submitBlockedBy({
  hasPassword,
  currentPassword,
  newPassword,
  confirmPassword,
}: {
  hasPassword: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): string | null {
  if (hasPassword && currentPassword.length === 0) {
    return "Enter your current password to change it.";
  }
  if (newPassword.length < MIN_LENGTH) {
    return `New password must be at least ${MIN_LENGTH} characters.`;
  }
  if (newPassword !== confirmPassword) {
    return "Passwords don't match.";
  }
  return null;
}

// ── Cold load ──────────────────────────────────────────────────────────────────

// Matches the real form's geometry — two label + control pairs and the action
// band — so the swap causes no shift. No focusable element inside.
function PasswordSkeleton() {
  return (
    <div aria-hidden>
      <div className="space-y-4 px-5 py-5">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
      <div className="flex justify-end border-t border-border/60 px-5 py-3">
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
    </div>
  );
}
