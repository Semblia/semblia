"use client";

/**
 * The "Two-factor authentication" settings section.
 *
 * Was a bordered box inside `SettingsSection` — a card inside a card — with a
 * raw `<Badge>` per state and its own `!isLoaded` skeleton. Now it is one row
 * in a `DataList` inside the fieldset, carrying exactly one status badge from
 * the account status vocabulary and at most two controls, with `DataState`
 * owning the ladder.
 */

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

import {
  DataList,
  DataState,
  ItemRow,
  ListSkeleton,
  SettingsSection,
  StatusBadge,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  MfaSetupDialog,
  RegenBackupCodesDialog,
} from "@/components/account/mfa-setup-dialog";
import { totpMeta } from "@/components/account/account-status";
import { useClerkDataState } from "@/components/account/use-clerk-data-state";

export function MfaSection() {
  const { user, isLoaded } = useUser();
  const state = useClerkDataState(user, isLoaded);

  const [setupOpen, setSetupOpen] = React.useState(false);
  const [regenOpen, setRegenOpen] = React.useState(false);
  const [disableOpen, setDisableOpen] = React.useState(false);
  const [disabling, setDisabling] = React.useState(false);

  const totpEnabled = Boolean(user?.twoFactorEnabled);

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

  return (
    <SettingsSection
      id="mfa"
      title="Two-factor authentication"
      description="Require a code from your authenticator app in addition to your password when signing in."
      staggerIndex={1}
      flush
    >
      <DataState
        state={state}
        resource="your two-factor settings"
        align="start"
        compactError
        skeleton={
          <ListSkeleton rows={1} leading="none" trailing density="dense" />
        }
      >
        <DataList aria-label="Two-factor methods">
          <ItemRow
            padding="dense"
            aria-label="Authenticator app"
            title={
              <span className="block text-sm font-medium text-foreground">
                Authenticator app
              </span>
            }
            subtitle={
              <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
                {totpEnabled
                  ? "Sign-in asks for a code from your authenticator app."
                  : "Add a second step with Google Authenticator, Authy, or any TOTP app."}
              </p>
            }
            trailing={
              <div className="flex items-center gap-2">
                <StatusBadge {...totpMeta(totpEnabled)} />
                {totpEnabled ? (
                  <>
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
                      Turn off two-factor
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setSetupOpen(true)}
                  >
                    Set up authenticator
                  </Button>
                )}
              </div>
            }
          />
        </DataList>
      </DataState>

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
        title="Turn off two-factor authentication?"
        description="Your account will be protected by its password alone. You can set it up again at any time."
        confirmLabel={disabling ? "Turning off…" : "Turn off two-factor"}
        onConfirm={disable}
      />
    </SettingsSection>
  );
}
