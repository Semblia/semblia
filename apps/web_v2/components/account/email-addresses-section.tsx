"use client";

/**
 * The "Email addresses" settings section: the list of addresses, the per-row
 * action menu, and the confirm shown before an address is removed.
 *
 * Restructured onto the shared system:
 *   • the list is a `DataList` of `ItemRow`s inside the settings fieldset —
 *     the second bordered box that used to sit inside `SettingsSection` is gone
 *   • `DataState` owns the ladder, so a session that fails to resolve reads as
 *     a failure instead of as an account with no email addresses
 *   • one badge per row. Verification is the status; "Primary" is a role, and
 *     roles belong in the row's metadata line, not in a competing pill
 *   • the menu never hides an action it merely can't run: "Make primary" and
 *     "Remove address" stay visible and inert, with the reason underneath, so
 *     the rule ("primary can't be removed") is learnable rather than invisible
 */

import {
  DotsThreeIcon,
  EnvelopeSimpleIcon,
  PlusIcon,
} from "@phosphor-icons/react";

import {
  DataList,
  DataState,
  EmptyState,
  ItemRow,
  ListSkeleton,
  SettingsSection,
  StatusBadge,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DestructiveConfirmDialog } from "@/components/account/destructive-confirm-dialog";
import { runWithToast } from "@/components/account/toast-action";
import { verificationMeta } from "@/components/account/account-status";
import { useClerkDataState } from "@/components/account/use-clerk-data-state";
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
  const addresses = user?.emailAddresses ?? [];
  const primaryEmailId = user?.primaryEmailAddress?.id;
  const state = useClerkDataState(user, isLoaded, { count: addresses.length });
  const ready = state.kind === "ready" || state.kind === "empty-first-run";

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
      description="Sign in with any verified address. The primary one receives account notifications."
      staggerIndex={1}
      flush
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={onAddEmail}
          disabled={!ready}
        >
          <PlusIcon className="size-3.5 mr-1" />
          Add email
        </Button>
      }
    >
      <DataState
        state={state}
        resource="your email addresses"
        align="start"
        compactError
        skeleton={
          <ListSkeleton rows={2} leading="none" trailing density="dense" />
        }
        empty={
          <EmptyState
            icon={EnvelopeSimpleIcon}
            align="start"
            className="px-4"
            title="No email addresses"
            description="Every account needs at least one address to sign in with and to receive notifications on."
          />
        }
      >
        <DataList aria-label="Email addresses">
          {addresses.map((addr) => (
            <EmailRow
              key={addr.id}
              addr={addr}
              isPrimary={addr.id === primaryEmailId}
              isOnlyAddress={addresses.length === 1}
              onVerify={() => onVerify(addr)}
              onMakePrimary={() => makePrimary(addr)}
              onRemove={() => onRemove(addr)}
            />
          ))}
        </DataList>
      </DataState>
    </SettingsSection>
  );
}

// ── Email row ──────────────────────────────────────────────────────────────────

interface EmailRowProps {
  addr: EmailAddressResource;
  isPrimary: boolean;
  isOnlyAddress: boolean;
  onVerify: () => void;
  onMakePrimary: () => void;
  onRemove: () => void;
}

function EmailRow({
  addr,
  isPrimary,
  isOnlyAddress,
  onVerify,
  onMakePrimary,
  onRemove,
}: EmailRowProps) {
  const verification = addr.verification?.status;
  const verified = verification === "verified";

  return (
    <ItemRow
      padding="dense"
      aria-label={addr.emailAddress}
      title={
        <span className="block truncate text-sm font-medium text-foreground">
          {addr.emailAddress}
        </span>
      }
      subtitle={
        isPrimary ? (
          <p className="text-xs text-muted-foreground">
            Primary — receives account notifications
          </p>
        ) : undefined
      }
      trailing={
        <div className="flex items-center gap-2">
          <StatusBadge {...verificationMeta(verification)} />
          <EmailRowMenu
            email={addr.emailAddress}
            verified={verified}
            isPrimary={isPrimary}
            isOnlyAddress={isOnlyAddress}
            onVerify={onVerify}
            onMakePrimary={onMakePrimary}
            onRemove={onRemove}
          />
        </div>
      }
    />
  );
}

// ── Email row menu ─────────────────────────────────────────────────────────────

interface EmailRowMenuProps {
  email: string;
  verified: boolean;
  isPrimary: boolean;
  isOnlyAddress: boolean;
  onVerify: () => void;
  onMakePrimary: () => void;
  onRemove: () => void;
}

/**
 * What an address offers turns on three facts Clerk enforces server-side: an
 * unverified address cannot be promoted, the primary address cannot be removed,
 * and the last remaining address cannot be removed either. Rather than hiding
 * the blocked action — which teaches nothing and reads as an inconsistent menu
 * — each stays visible and inert with its reason directly beneath it.
 */
function EmailRowMenu({
  email,
  verified,
  isPrimary,
  isOnlyAddress,
  onVerify,
  onMakePrimary,
  onRemove,
}: EmailRowMenuProps) {
  const promoteBlockedBy = isPrimary
    ? "Already your primary address"
    : !verified
      ? "Verify this address first"
      : null;
  const removeBlockedBy = isPrimary
    ? "Make another address primary first"
    : isOnlyAddress
      ? "Your account needs at least one address"
      : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 shrink-0">
          <DotsThreeIcon className="size-4" />
          <span className="sr-only">Options for {email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {!verified && (
          <DropdownMenuItem onClick={onVerify}>Verify address</DropdownMenuItem>
        )}

        <BlockableItem
          label="Make primary"
          blockedBy={promoteBlockedBy}
          onSelect={onMakePrimary}
        />

        <DropdownMenuSeparator />

        <BlockableItem
          label="Remove address"
          blockedBy={removeBlockedBy}
          destructive
          onSelect={onRemove}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * A menu item that states why it can't be used. A disabled control explained
 * only by a tooltip is unreachable — a disabled item takes neither pointer nor
 * focus events — so the reason renders in the flow, under the label.
 */
function BlockableItem({
  label,
  blockedBy,
  destructive = false,
  onSelect,
}: {
  label: string;
  blockedBy: string | null;
  destructive?: boolean;
  onSelect: () => void;
}) {
  if (!blockedBy) {
    return (
      <DropdownMenuItem
        variant={destructive ? "destructive" : "default"}
        onClick={onSelect}
      >
        {label}
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem disabled className="flex-col items-start gap-0.5">
      <span>{label}</span>
      <span className="text-[11px] text-muted-foreground">{blockedBy}</span>
    </DropdownMenuItem>
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
      confirmLabel="Remove address"
      action={(addr) => addr.destroy()}
      successMessage="Email removed."
      errorMessage="Failed to remove email."
    />
  );
}
