"use client";

/**
 * Profile — the account's identity surface.
 *
 * The page is composition only: four settings fieldsets, the sticky save bar,
 * and the dialogs those fieldsets hand off to. Each section owns its own data
 * state through `useClerkDataState`, so a section that fails replaces only
 * itself rather than blanking the page.
 *
 * The save bar renders only once the profile has actually loaded — offering
 * "Save changes" over a session that never resolved is an action the request
 * would refuse.
 */

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

import { PageHeader, PageBody, SettingsFooter } from "@/components/shared";
import { IdentitySection } from "@/components/account/identity-section";
import {
  EmailAddressesSection,
  RemoveEmailDialog,
} from "@/components/account/email-addresses-section";
import {
  AddEmailDialog,
  VerifyEmailDialog,
} from "@/components/account/email-dialogs";
import {
  ConnectedAccountsSection,
  DisconnectAccountDialog,
} from "@/components/account/connected-accounts-section";
import {
  DangerZoneSection,
  DeleteAccountDialog,
} from "@/components/account/danger-zone-section";
import { useClerkDataState } from "@/components/account/use-clerk-data-state";
import type {
  EmailAddressResource,
  ExternalAccountResource,
  MaybeUserResource,
} from "@/components/account/clerk-user-types";

// ── Profile helpers ────────────────────────────────────────────────────────────

// Saved name on the account, normalised to strings for the controlled inputs.
function savedName(user: MaybeUserResource) {
  return { first: user?.firstName ?? "", last: user?.lastName ?? "" };
}

// Avatar fallback initials, derived from the name and then the first email.
function userInitials(user: MaybeUserResource) {
  return (
    [user?.firstName?.[0], user?.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() ||
    user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ||
    "?"
  );
}

// ── Profile page ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const identityState = useClerkDataState(user, isLoaded);

  // Name form
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      const current = savedName(user);
      setFirstName(current.first);
      setLastName(current.last);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saved = savedName(user);
  const dirty =
    isLoaded && (firstName !== saved.first || lastName !== saved.last);

  function discard() {
    const current = savedName(user);
    setFirstName(current.first);
    setLastName(current.last);
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    // Persist the trimmed values AND adopt them locally, so a name that
    // differed only by whitespace does not leave the form reading as dirty
    // after a successful save.
    const nextFirst = firstName.trim();
    const nextLast = lastName.trim();
    try {
      await user.update({ firstName: nextFirst, lastName: nextLast });
      setFirstName(nextFirst);
      setLastName(nextLast);
      toast.success("Profile updated.");
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  // Email management
  const [addEmailOpen, setAddEmailOpen] = React.useState(false);
  const [verifyTarget, setVerifyTarget] =
    React.useState<EmailAddressResource | null>(null);
  const [removeTarget, setRemoveTarget] =
    React.useState<EmailAddressResource | null>(null);

  // Connected accounts
  const [disconnectTarget, setDisconnectTarget] =
    React.useState<ExternalAccountResource | null>(null);

  // Delete account
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  return (
    <>
      {/* Identity and state, never prose — the explanation of each area lives
          on that area's own section description. */}
      <PageHeader
        title="Profile"
        description={
          identityState.kind === "ready"
            ? (user?.primaryEmailAddress?.emailAddress ?? undefined)
            : undefined
        }
      />

      <PageBody measure padding="default" withFooter className="space-y-8">
        <IdentitySection
          state={identityState}
          imageUrl={user?.imageUrl}
          initials={userInitials(user)}
          firstName={firstName}
          lastName={lastName}
          onFirstNameChange={setFirstName}
          onLastNameChange={setLastName}
        />

        <EmailAddressesSection
          user={user}
          isLoaded={isLoaded}
          onAddEmail={() => setAddEmailOpen(true)}
          onVerify={setVerifyTarget}
          onRemove={setRemoveTarget}
        />

        <ConnectedAccountsSection
          user={user}
          isLoaded={isLoaded}
          onDisconnect={setDisconnectTarget}
        />

        <DangerZoneSection
          onDelete={() => {
            setDeleteConfirmText("");
            setDeleteDialogOpen(true);
          }}
        />
      </PageBody>

      {identityState.kind === "ready" && (
        <SettingsFooter
          dirty={dirty}
          saving={saving}
          onSave={save}
          onDiscard={discard}
        />
      )}

      <AddEmailDialog
        open={addEmailOpen}
        onOpenChange={setAddEmailOpen}
        onAdded={(addr) => setVerifyTarget(addr)}
      />

      <VerifyEmailDialog
        emailAddress={verifyTarget}
        open={!!verifyTarget}
        onOpenChange={(o) => !o && setVerifyTarget(null)}
        onVerified={() => setVerifyTarget(null)}
      />

      <RemoveEmailDialog
        target={removeTarget}
        onClose={() => setRemoveTarget(null)}
      />

      <DisconnectAccountDialog
        target={disconnectTarget}
        onClose={() => setDisconnectTarget(null)}
      />

      {/* Delete account dialog — type-to-confirm */}
      <DeleteAccountDialog
        user={user}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        confirmText={deleteConfirmText}
        onConfirmTextChange={setDeleteConfirmText}
      />
    </>
  );
}
