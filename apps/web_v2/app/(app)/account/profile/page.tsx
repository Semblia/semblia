"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
type EmailAddressResource = NonNullable<
  ReturnType<typeof useUser>["user"]
>["emailAddresses"][number];
type ExternalAccountResource = NonNullable<
  ReturnType<typeof useUser>["user"]
>["externalAccounts"][number];
type MaybeUserResource = ReturnType<typeof useUser>["user"];
import { toast } from "sonner";
import { signInPath } from "@/lib/routes";
import {
  PageHeader,
  PageBody,
  SettingsSection,
  SettingsFooter,
} from "@/components/shared";
import { AvatarUpload } from "@/components/account/avatar-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  DotsThreeIcon,
  PlusIcon,
  GoogleLogoIcon,
  GithubLogoIcon,
  LinkIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

// ── Email verification dialog ──────────────────────────────────────────────────

interface VerifyEmailDialogProps {
  emailAddress: EmailAddressResource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

function VerifyEmailDialog({
  emailAddress,
  open,
  onOpenChange,
  onVerified,
}: VerifyEmailDialogProps) {
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
    if (open && emailAddress) sendCode();
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
          {sendFailed ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-xs text-destructive">
                We couldn&apos;t send a code to that address.
              </p>
              <Button variant="outline" size="sm" onClick={sendCode}>
                Try again
              </Button>
            </div>
          ) : !sent ? (
            <Skeleton className="h-10 w-48 rounded-md" />
          ) : (
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              onComplete={verify}
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={code.length < 6 || verifying || !sent}
            onClick={verify}
          >
            {verifying ? "Verifying…" : "Verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add email dialog ───────────────────────────────────────────────────────────

interface AddEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (email: EmailAddressResource) => void;
}

function AddEmailDialog({ open, onOpenChange, onAdded }: AddEmailDialogProps) {
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

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={!email.trim() || adding} onClick={add}>
            {adding ? "Adding…" : "Add email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Email row ──────────────────────────────────────────────────────────────────

interface EmailRowProps {
  addr: EmailAddressResource;
  isPrimary: boolean;
  onVerify: () => void;
  onMakePrimary: () => void;
  onRemove: () => void;
}

function EmailRow({
  addr,
  isPrimary,
  onVerify,
  onMakePrimary,
  onRemove,
}: EmailRowProps) {
  const verified = addr.verification?.status === "verified";

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex items-center gap-2 flex-wrap">
        <span className="text-sm text-foreground truncate">
          {addr.emailAddress}
        </span>
        {isPrimary && (
          <Badge variant="outline" className="shrink-0 text-[10px]">
            Primary
          </Badge>
        )}
        {verified ? (
          <Badge variant="success" className="shrink-0 text-[10px]">
            Verified
          </Badge>
        ) : (
          <Badge variant="destructive" className="shrink-0 text-[10px]">
            Unverified
          </Badge>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7 shrink-0">
            <DotsThreeIcon className="size-4" />
            <span className="sr-only">Email options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {!verified && (
            <DropdownMenuItem onClick={onVerify}>Verify</DropdownMenuItem>
          )}
          {verified && !isPrimary && (
            <DropdownMenuItem onClick={onMakePrimary}>
              Make primary
            </DropdownMenuItem>
          )}
          {!isPrimary && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onRemove}
              >
                Remove
              </DropdownMenuItem>
            </>
          )}
          {isPrimary && verified && (
            <DropdownMenuItem disabled>
              <span className="text-muted-foreground text-xs">
                Primary email
              </span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

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
          <div className="space-y-1.5">
            <Label htmlFor="first-name">First name</Label>
            {!isLoaded ? (
              <Skeleton className="h-9 w-full rounded-md" />
            ) : (
              <Input
                id="first-name"
                value={firstName}
                onChange={(e) => onFirstNameChange(e.target.value)}
                placeholder="First name"
                autoComplete="given-name"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last-name">Last name</Label>
            {!isLoaded ? (
              <Skeleton className="h-9 w-full rounded-md" />
            ) : (
              <Input
                id="last-name"
                value={lastName}
                onChange={(e) => onLastNameChange(e.target.value)}
                placeholder="Last name"
                autoComplete="family-name"
              />
            )}
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}

// ── Email addresses section ────────────────────────────────────────────────────

interface EmailAddressesSectionProps {
  user: MaybeUserResource;
  isLoaded: boolean;
  onAddEmail: () => void;
  onVerify: (addr: EmailAddressResource) => void;
  onRemove: (addr: EmailAddressResource) => void;
}

function EmailAddressesSection({
  user,
  isLoaded,
  onAddEmail,
  onVerify,
  onRemove,
}: EmailAddressesSectionProps) {
  const primaryEmailId = user?.primaryEmailAddress?.id;

  async function makePrimary(addr: EmailAddressResource) {
    try {
      await user?.update({ primaryEmailAddressId: addr.id });
      toast.success("Primary email updated.");
    } catch {
      toast.error("Failed to update primary email.");
    }
  }

  return (
    <SettingsSection
      id="emails"
      title="Email addresses"
      description="Sign in with any verified email. Primary address receives account notifications."
      staggerIndex={1}
      flush
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={onAddEmail}
          disabled={!isLoaded}
        >
          <PlusIcon className="size-3.5 mr-1" />
          Add email
        </Button>
      }
    >
      <div className="divide-y divide-border">
        {!isLoaded
          ? Array.from({ length: 1 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <Skeleton className="h-4 w-48" />
              </div>
            ))
          : user?.emailAddresses.map((addr) => (
              <EmailRow
                key={addr.id}
                addr={addr}
                isPrimary={addr.id === primaryEmailId}
                onVerify={() => onVerify(addr)}
                onMakePrimary={() => makePrimary(addr)}
                onRemove={() => onRemove(addr)}
              />
            ))}
      </div>
    </SettingsSection>
  );
}

// ── Remove email dialog ────────────────────────────────────────────────────────

interface RemoveEmailDialogProps {
  target: EmailAddressResource | null;
  onClose: () => void;
}

function RemoveEmailDialog({ target, onClose }: RemoveEmailDialogProps) {
  async function removeEmail() {
    if (!target) return;
    try {
      await target.destroy();
      toast.success("Email removed.");
    } catch {
      toast.error("Failed to remove email.");
    } finally {
      onClose();
    }
  }

  return (
    <ConfirmationDialog
      open={!!target}
      onOpenChange={(o) => !o && onClose()}
      intent="danger"
      title="Remove email address"
      description={
        <>
          Remove{" "}
          <span className="font-medium text-foreground">
            {target?.emailAddress}
          </span>{" "}
          from your account? This cannot be undone.
        </>
      }
      confirmLabel="Remove"
      onConfirm={removeEmail}
    />
  );
}

// ── Connected accounts section ─────────────────────────────────────────────────

interface ConnectedAccountsSectionProps {
  user: MaybeUserResource;
  isLoaded: boolean;
  onDisconnect: (acct: ExternalAccountResource) => void;
}

function ConnectedAccountsSection({
  user,
  isLoaded,
  onDisconnect,
}: ConnectedAccountsSectionProps) {
  const [connecting, setConnecting] = React.useState(false);

  async function connectGoogle() {
    if (!user || connecting) return;
    setConnecting(true);
    try {
      const account = await user.createExternalAccount({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/sso-callback`,
      });
      const redirect = account.verification?.externalVerificationRedirectURL;
      if (redirect) {
        window.location.href = redirect.toString();
        return;
      }
      toast.error("Could not start Google connect flow.");
    } catch {
      toast.error("Failed to connect Google account.");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <SettingsSection
      id="connected"
      title="Connected accounts"
      description="Sign in faster by linking an external provider."
      staggerIndex={2}
      flush
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={connectGoogle}
          disabled={
            !isLoaded ||
            connecting ||
            user?.externalAccounts.some((a) => a.provider === "google")
          }
        >
          <GoogleLogoIcon className="size-3.5 mr-1.5" />
          {connecting ? "Connecting…" : "Connect Google"}
        </Button>
      }
    >
      <div className="divide-y divide-border">
        {!isLoaded ? (
          <div className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : user?.externalAccounts.length === 0 ? (
          <div className="px-4 py-4 text-sm text-muted-foreground text-center">
            No connected accounts.
          </div>
        ) : (
          user?.externalAccounts.map((acct) => (
            <ConnectedAccountRow
              key={acct.id}
              acct={acct}
              onDisconnect={() => onDisconnect(acct)}
            />
          ))
        )}
      </div>
    </SettingsSection>
  );
}

// ── Connected account row ──────────────────────────────────────────────────────

interface ConnectedAccountRowProps {
  acct: ExternalAccountResource;
  onDisconnect: () => void;
}

function ConnectedAccountRow({ acct, onDisconnect }: ConnectedAccountRowProps) {
  const Icon =
    acct.provider === "google"
      ? GoogleLogoIcon
      : acct.provider === "github"
        ? GithubLogoIcon
        : LinkIcon;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm text-foreground capitalize">{acct.provider}</p>
          <p className="text-xs text-muted-foreground truncate">
            {acct.emailAddress || acct.username}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onDisconnect}
      >
        Disconnect
      </Button>
    </div>
  );
}

// ── Disconnect account dialog ──────────────────────────────────────────────────

interface DisconnectAccountDialogProps {
  target: ExternalAccountResource | null;
  onClose: () => void;
}

function DisconnectAccountDialog({
  target,
  onClose,
}: DisconnectAccountDialogProps) {
  async function disconnect() {
    if (!target) return;
    try {
      await target.destroy();
      toast.success("Account disconnected.");
    } catch {
      toast.error("Failed to disconnect account.");
    } finally {
      onClose();
    }
  }

  return (
    <ConfirmationDialog
      open={!!target}
      onOpenChange={(o) => !o && onClose()}
      intent="warning"
      title="Disconnect account?"
      description={
        <>
          Disconnect your{" "}
          <span className="font-medium text-foreground capitalize">
            {target?.provider}
          </span>{" "}
          account? You can reconnect it later.
        </>
      }
      confirmLabel="Disconnect"
      onConfirm={disconnect}
    />
  );
}

// ── Danger zone section ────────────────────────────────────────────────────────

interface DangerZoneSectionProps {
  onDelete: () => void;
}

function DangerZoneSection({ onDelete }: DangerZoneSectionProps) {
  return (
    <SettingsSection
      id="danger"
      title="Danger zone"
      description="Irreversible actions that affect your account."
      staggerIndex={3}
      tone="danger"
      flush
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-destructive">Delete account</p>
          <p className="text-xs text-muted-foreground max-w-[42ch]">
            Permanently delete your account and all associated data. This cannot
            be undone.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="shrink-0 tactile"
          onClick={onDelete}
        >
          <TrashIcon className="size-3.5 mr-1" />
          Delete
        </Button>
      </div>
    </SettingsSection>
  );
}

// ── Delete account dialog ──────────────────────────────────────────────────────

interface DeleteAccountDialogProps {
  user: MaybeUserResource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmText: string;
  onConfirmTextChange: (value: string) => void;
}

function DeleteAccountDialog({
  user,
  open,
  onOpenChange,
  confirmText,
  onConfirmTextChange,
}: DeleteAccountDialogProps) {
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);

  async function deleteAccount() {
    if (!user) return;
    setDeleting(true);
    try {
      await user.delete();
      router.push(signInPath());
    } catch {
      toast.error("Failed to delete account.");
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete account</DialogTitle>
          <DialogDescription>
            This will permanently delete your account and all associated data.
            Type{" "}
            <span className="font-mono font-medium text-destructive">
              delete my account
            </span>{" "}
            to confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor="delete-account-confirm" className="sr-only">
            Type &quot;delete my account&quot; to confirm
          </Label>
          <Input
            id="delete-account-confirm"
            value={confirmText}
            onChange={(e) => onConfirmTextChange(e.target.value)}
            placeholder="delete my account"
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={
              confirmText.trim().toLowerCase() !== "delete my account" ||
              deleting
            }
            onClick={deleteAccount}
            className="min-w-[7rem]"
          >
            {deleting ? "Deleting…" : "Delete account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
