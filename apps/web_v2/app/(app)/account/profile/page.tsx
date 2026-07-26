"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

import {
  PageHeader,
  PageBody,
  SettingsSection,
  SettingsFooter,
} from "@/components/shared";
import { AvatarUpload } from "@/components/account/avatar-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import type {
  EmailAddressResource,
  ExternalAccountResource,
  MaybeUserResource,
} from "@/components/account/clerk-user-types";

// ── Identity section ───────────────────────────────────────────────────────────

interface IdentitySectionProps {
  isLoaded: boolean;
  imageUrl?: string | null;
  initials: string;
  firstName: string;
  lastName: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
}

function IdentitySection({
  isLoaded,
  imageUrl,
  initials,
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
}: IdentitySectionProps) {
  return (
    <SettingsSection
      id="identity"
      title="Identity"
      description="Your name and photo shown on your profile and in notifications."
      staggerIndex={0}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        {/* Avatar */}
        <div className="shrink-0">
          {!isLoaded ? (
            <Skeleton className="size-16 rounded-full" />
          ) : (
            <AvatarUpload imageUrl={imageUrl} initials={initials} />
          )}
        </div>

        {/* Name fields */}
        <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NameField
            id="first-name"
            label="First name"
            isLoaded={isLoaded}
            value={firstName}
            onChange={onFirstNameChange}
            autoComplete="given-name"
          />
          <NameField
            id="last-name"
            label="Last name"
            isLoaded={isLoaded}
            value={lastName}
            onChange={onLastNameChange}
            autoComplete="family-name"
          />
        </div>
      </div>
    </SettingsSection>
  );
}

// ── Name field ─────────────────────────────────────────────────────────────────

interface NameFieldProps {
  id: string;
  label: string;
  isLoaded: boolean;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}

// One labelled name input, skeletonised until Clerk has the user. The label
// doubles as the input's placeholder, as it did before the fields were shared.
function NameField({
  id,
  label,
  isLoaded,
  value,
  onChange,
  autoComplete,
}: NameFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {!isLoaded ? (
        <Skeleton className="h-9 w-full rounded-md" />
      ) : (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={label}
          autoComplete={autoComplete}
        />
      )}
    </div>
  );
}

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
      <PageHeader title="Profile" />

      <PageBody padding="default" withFooter className="space-y-8">
        {/* Identity — photo + name merged */}
        <IdentitySection
          isLoaded={isLoaded}
          imageUrl={user?.imageUrl}
          initials={userInitials(user)}
          firstName={firstName}
          lastName={lastName}
          onFirstNameChange={setFirstName}
          onLastNameChange={setLastName}
        />

        {/* Emails */}
        <EmailAddressesSection
          user={user}
          isLoaded={isLoaded}
          onAddEmail={() => setAddEmailOpen(true)}
          onVerify={setVerifyTarget}
          onRemove={setRemoveTarget}
        />

        {/* Connected accounts */}
        <ConnectedAccountsSection
          user={user}
          isLoaded={isLoaded}
          onDisconnect={setDisconnectTarget}
        />

        {/* Danger zone */}
        <DangerZoneSection
          onDelete={() => {
            setDeleteConfirmText("");
            setDeleteDialogOpen(true);
          }}
        />
      </PageBody>

      <SettingsFooter
        dirty={dirty}
        saving={saving}
        onSave={save}
        onDiscard={discard}
      />

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
