"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
type EmailAddressResource = NonNullable<
  ReturnType<typeof useUser>["user"]
>["emailAddresses"][number];
type ExternalAccountResource = NonNullable<
  ReturnType<typeof useUser>["user"]
>["externalAccounts"][number];
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { DotsThreeIcon, PlusIcon, GoogleLogoIcon, GithubLogoIcon, LinkIcon, TrashIcon } from "@phosphor-icons/react";
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

  React.useEffect(() => {
    if (open && emailAddress) {
      setSent(false);
      setCode("");
      emailAddress
        .prepareVerification({ strategy: "email_code" })
        .then(() => setSent(true))
        .catch(() => toast.error("Failed to send verification code."));
    }
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
          {!sent ? (
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!email.trim() || adding}
            onClick={add}
          >
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
          <Badge variant="secondary" className="shrink-0 text-[10px] bg-success/10 text-success border-success/20">
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
            <DropdownMenuItem onClick={onVerify}>
              Verify
            </DropdownMenuItem>
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
              <span className="text-muted-foreground text-xs">Primary email</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty =
    isLoaded &&
    (firstName !== (user?.firstName ?? "") ||
      lastName !== (user?.lastName ?? ""));

  function discard() {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
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

  async function makePrimary(addr: EmailAddressResource) {
    try {
      await user?.update({ primaryEmailAddressId: addr.id });
      toast.success("Primary email updated.");
    } catch {
      toast.error("Failed to update primary email.");
    }
  }

  async function removeEmail() {
    if (!removeTarget) return;
    try {
      await removeTarget.destroy();
      toast.success("Email removed.");
    } catch {
      toast.error("Failed to remove email.");
    } finally {
      setRemoveTarget(null);
    }
  }

  // Connected accounts
  const [disconnectTarget, setDisconnectTarget] =
    React.useState<ExternalAccountResource | null>(null);

  async function connectGoogle() {
    if (!user) return;
    try {
      await user.createExternalAccount({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
      });
    } catch {
      toast.error("Failed to connect Google account.");
    }
  }

  async function disconnect() {
    if (!disconnectTarget) return;
    try {
      await disconnectTarget.destroy();
      toast.success("Account disconnected.");
    } catch {
      toast.error("Failed to disconnect account.");
    } finally {
      setDisconnectTarget(null);
    }
  }

  // Delete account
  const router = useRouter();
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function deleteAccount() {
    if (!user) return;
    setDeleting(true);
    try {
      await user.delete();
      router.push("/sign-in");
    } catch {
      toast.error("Failed to delete account.");
      setDeleting(false);
    }
  }

  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() ||
    user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ||
    "?";

  return (
    <>
      <PageHeader title="Profile" description="Manage your personal information." />

      <PageBody padding="default" className="space-y-8 pb-24">
        {/* Avatar */}
        <SettingsSection id="avatar" title="Photo" staggerIndex={0}>
          <div className="flex items-center gap-5">
            {!isLoaded ? (
              <Skeleton className="size-16 rounded-full" />
            ) : (
              <AvatarUpload imageUrl={user?.imageUrl} initials={initials} />
            )}
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {isLoaded ? (
                  user?.fullName || "—"
                ) : (
                  <Skeleton className="h-4 w-32" />
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {isLoaded ? (
                  user?.primaryEmailAddress?.emailAddress ?? ""
                ) : (
                  <Skeleton className="h-3 w-48" />
                )}
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* Name */}
        <SettingsSection
          id="name"
          title="Personal info"
          description="Your name is shown on your profile and in notifications sent to collaborators."
          staggerIndex={1}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="first-name">First name</Label>
              {!isLoaded ? (
                <Skeleton className="h-9 w-full rounded-md" />
              ) : (
                <Input
                  id="first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
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
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  autoComplete="family-name"
                />
              )}
            </div>
          </div>
        </SettingsSection>

        {/* Emails */}
        <SettingsSection
          id="emails"
          title="Email addresses"
          description="Sign in with any verified email. Primary address receives account notifications."
          staggerIndex={2}
        >
          <Card>
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
              <span className="text-xs text-muted-foreground">
                {isLoaded
                  ? `${user?.emailAddresses.length ?? 0} address${(user?.emailAddresses.length ?? 0) === 1 ? "" : "es"}`
                  : ""}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddEmailOpen(true)}
                disabled={!isLoaded}
              >
                <PlusIcon className="size-3.5 mr-1" />
                Add email
              </Button>
            </div>

            <div className="divide-y divide-border">
              {!isLoaded
                ? Array.from({ length: 1 }, (_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <Skeleton className="h-4 w-48" />
                    </div>
                  ))
                : user?.emailAddresses.map((addr) => (
                    <EmailRow
                      key={addr.id}
                      addr={addr}
                      isPrimary={
                        addr.id === user.primaryEmailAddress?.id
                      }
                      onVerify={() => setVerifyTarget(addr)}
                      onMakePrimary={() => makePrimary(addr)}
                      onRemove={() => setRemoveTarget(addr)}
                    />
                  ))}
            </div>
          </Card>
        </SettingsSection>

        {/* Connected accounts */}
        <SettingsSection
          id="connected"
          title="Connected accounts"
          description="Sign in faster by linking an external provider."
          staggerIndex={3}
        >
          <Card>
            <div className="divide-y divide-border">
              {!isLoaded ? (
                <div className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="size-6 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ) : user?.externalAccounts.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  No connected accounts.
                </div>
              ) : (
                user?.externalAccounts.map((acct) => {
                  const Icon =
                    acct.provider === "google"
                      ? GoogleLogoIcon
                      : acct.provider === "github"
                        ? GithubLogoIcon
                        : LinkIcon;
                  return (
                    <div
                      key={acct.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-sm text-foreground capitalize">
                            {acct.provider}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {acct.emailAddress || acct.username}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDisconnectTarget(acct)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
            <div className="border-t border-border px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={connectGoogle}
                disabled={
                  !isLoaded ||
                  user?.externalAccounts.some((a) => a.provider === "google")
                }
              >
                <GoogleLogoIcon className="size-3.5 mr-1.5" />
                Connect Google
              </Button>
            </div>
          </Card>
        </SettingsSection>

        {/* Danger zone */}
        <SettingsSection
          id="danger"
          title="Danger zone"
          staggerIndex={4}
        >
          <Card className="border-destructive/30 ring-destructive/10">
            <CardContent className="flex items-start justify-between gap-4 pt-0">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  Delete account
                </p>
                <p className="text-xs text-muted-foreground max-w-[42ch]">
                  Permanently delete your account and all associated data. This
                  cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  setDeleteConfirmText("");
                  setDeleteDialogOpen(true);
                }}
              >
                <TrashIcon className="size-3.5 mr-1" />
                Delete
              </Button>
            </CardContent>
          </Card>
        </SettingsSection>
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

      <ConfirmationDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        intent="danger"
        title="Remove email address"
        description={
          <>
            Remove{" "}
            <span className="font-medium text-foreground">
              {removeTarget?.emailAddress}
            </span>{" "}
            from your account? This cannot be undone.
          </>
        }
        confirmLabel="Remove"
        onConfirm={removeEmail}
      />

      <ConfirmationDialog
        open={!!disconnectTarget}
        onOpenChange={(o) => !o && setDisconnectTarget(null)}
        intent="warning"
        title="Disconnect account?"
        description={
          <>
            Disconnect your{" "}
            <span className="font-medium text-foreground capitalize">
              {disconnectTarget?.provider}
            </span>{" "}
            account? You can reconnect it later.
          </>
        }
        confirmLabel="Disconnect"
        onConfirm={disconnect}
      />

      {/* Delete account dialog — type-to-confirm */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="delete my account"
            />
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={
                deleteConfirmText.trim().toLowerCase() !== "delete my account" ||
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
    </>
  );
}
