"use client";

/**
 * The "Email addresses" settings section: the list of addresses, the per-row
 * action menu, and the confirm shown before an address is removed.
 */

import { DotsThreeIcon, PlusIcon } from "@phosphor-icons/react";

import { SettingsSection } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { DestructiveConfirmDialog } from "@/components/account/destructive-confirm-dialog";
import { runWithToast } from "@/components/account/toast-action";
import type {
  EmailAddressResource,
  MaybeUserResource,
} from "@/components/account/clerk-user-types";

// ── Email addresses section ────────────────────────────────────────────────────

interface EmailAddressesSectionProps {
  user: MaybeUserResource;
  isLoaded: boolean;
  onAddEmail: () => void;
  onVerify: (addr: EmailAddressResource) => void;
  onRemove: (addr: EmailAddressResource) => void;
}

export function EmailAddressesSection({
  user,
  isLoaded,
  onAddEmail,
  onVerify,
  onRemove,
}: EmailAddressesSectionProps) {
  const primaryEmailId = user?.primaryEmailAddress?.id;

  async function makePrimary(addr: EmailAddressResource) {
    await runWithToast(() => user?.update({ primaryEmailAddressId: addr.id }), {
      success: "Primary email updated.",
      error: "Failed to update primary email.",
    });
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

      <EmailRowMenu
        verified={verified}
        isPrimary={isPrimary}
        onVerify={onVerify}
        onMakePrimary={onMakePrimary}
        onRemove={onRemove}
      />
    </div>
  );
}

// ── Email row menu ─────────────────────────────────────────────────────────────

interface EmailRowMenuProps {
  verified: boolean;
  isPrimary: boolean;
  onVerify: () => void;
  onMakePrimary: () => void;
  onRemove: () => void;
}

// What an address offers turns on two facts: an unverified address can only be
// verified, and the primary address can neither be promoted nor removed.
function EmailRowMenu({
  verified,
  isPrimary,
  onVerify,
  onMakePrimary,
  onRemove,
}: EmailRowMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 shrink-0">
          <DotsThreeIcon className="size-4" />
          <span className="sr-only">Email options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {!verified ? (
          <DropdownMenuItem onClick={onVerify}>Verify</DropdownMenuItem>
        ) : isPrimary ? (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground text-xs">Primary email</span>
          </DropdownMenuItem>
        ) : (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Remove email dialog ────────────────────────────────────────────────────────

interface RemoveEmailDialogProps {
  target: EmailAddressResource | null;
  onClose: () => void;
}

export function RemoveEmailDialog({ target, onClose }: RemoveEmailDialogProps) {
  return (
    <DestructiveConfirmDialog
      target={target}
      onClose={onClose}
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
      action={(addr) => addr.destroy()}
      successMessage="Email removed."
      errorMessage="Failed to remove email."
    />
  );
}
