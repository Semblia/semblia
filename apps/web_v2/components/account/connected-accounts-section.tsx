"use client";

/**
 * The "Connected accounts" settings section: the linked external providers,
 * the control that starts a Google link, and the confirm shown before one is
 * unlinked.
 */

import * as React from "react";
import {
  GithubLogoIcon,
  GoogleLogoIcon,
  LinkIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { SettingsSection } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DestructiveConfirmDialog } from "@/components/account/destructive-confirm-dialog";
import type {
  ExternalAccountResource,
  MaybeUserResource,
} from "@/components/account/clerk-user-types";

// ── Connected accounts section ─────────────────────────────────────────────────

interface ConnectedAccountsSectionProps {
  user: MaybeUserResource;
  isLoaded: boolean;
  onDisconnect: (acct: ExternalAccountResource) => void;
}

export function ConnectedAccountsSection({
  user,
  isLoaded,
  onDisconnect,
}: ConnectedAccountsSectionProps) {
  return (
    <SettingsSection
      id="connected"
      title="Connected accounts"
      description="Sign in faster by linking an external provider."
      staggerIndex={2}
      flush
      actions={<ConnectGoogleButton user={user} isLoaded={isLoaded} />}
    >
      <div className="divide-y divide-border">
        <ConnectedAccountsList
          accounts={user?.externalAccounts}
          isLoaded={isLoaded}
          onDisconnect={onDisconnect}
        />
      </div>
    </SettingsSection>
  );
}

// ── Connect Google button ──────────────────────────────────────────────────────

interface ConnectGoogleButtonProps {
  user: MaybeUserResource;
  isLoaded: boolean;
}

// Starts Clerk's Google link flow and hands the browser to the provider. The
// pending state belongs here because nothing else on the page reads it.
function ConnectGoogleButton({ user, isLoaded }: ConnectGoogleButtonProps) {
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
  );
}

// ── Connected accounts list ────────────────────────────────────────────────────

interface ConnectedAccountsListProps {
  accounts: ExternalAccountResource[] | undefined;
  isLoaded: boolean;
  onDisconnect: (acct: ExternalAccountResource) => void;
}

function ConnectedAccountsList({
  accounts,
  isLoaded,
  onDisconnect,
}: ConnectedAccountsListProps) {
  if (!isLoaded) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }

  if (accounts?.length === 0) {
    return (
      <div className="px-4 py-4 text-sm text-muted-foreground text-center">
        No connected accounts.
      </div>
    );
  }

  return accounts?.map((acct) => (
    <ConnectedAccountRow
      key={acct.id}
      acct={acct}
      onDisconnect={() => onDisconnect(acct)}
    />
  ));
}

// ── Connected account row ──────────────────────────────────────────────────────

// Provider marks Semblia can link; anything else falls back to a generic link.
// Null-prototype so a provider named like an Object member ("constructor",
// "toString") falls through to the fallback instead of resolving to a
// non-component off the prototype chain.
const providerIcons: Record<string, PhosphorIcon> = Object.assign(
  Object.create(null) as Record<string, PhosphorIcon>,
  {
    google: GoogleLogoIcon,
    github: GithubLogoIcon,
  },
);

interface ConnectedAccountRowProps {
  acct: ExternalAccountResource;
  onDisconnect: () => void;
}

function ConnectedAccountRow({ acct, onDisconnect }: ConnectedAccountRowProps) {
  const Icon = providerIcons[acct.provider] ?? LinkIcon;

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

export function DisconnectAccountDialog({
  target,
  onClose,
}: DisconnectAccountDialogProps) {
  return (
    <DestructiveConfirmDialog
      target={target}
      onClose={onClose}
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
      action={(acct) => acct.destroy()}
      successMessage="Account disconnected."
      errorMessage="Failed to disconnect account."
    />
  );
}
