"use client";

/**
 * The "Connected accounts" settings section: the linked external providers,
 * the control that starts a Google link, and the confirm shown before one is
 * unlinked.
 *
 * Restructured onto the shared system:
 *   • rows are `ItemRow`s in a `DataList` inside the settings fieldset; the
 *     bordered box that used to wrap them inside `SettingsSection` is gone
 *   • `DataState` owns the ladder — "No connected accounts." was rendered for a
 *     failed session just as readily as for an account with none
 *   • one badge per row, carrying the link's verification state, with a
 *     readable fallback for a status Clerk grows before this app knows it
 *   • the Connect control never sits bare-disabled: when Google is already
 *     linked, the section footer says so where the user is looking
 */

import * as React from "react";
import {
  GithubLogoIcon,
  GoogleLogoIcon,
  LinkIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";

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
import { DestructiveConfirmDialog } from "@/components/account/destructive-confirm-dialog";
import { verificationMeta } from "@/components/account/account-status";
import { useClerkDataState } from "@/components/account/use-clerk-data-state";
import { humanizeLabel, orDash } from "@/lib/format";
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
  const accounts = user?.externalAccounts ?? [];
  const state = useClerkDataState(user, isLoaded, { count: accounts.length });
  const googleLinked = accounts.some((a) => a.provider === "google");

  return (
    <SettingsSection
      id="connected"
      title="Connected accounts"
      description="Sign in faster by linking an external provider."
      staggerIndex={2}
      flush
      actions={
        <ConnectGoogleButton
          user={user}
          disabled={state.kind !== "ready" && state.kind !== "empty-first-run"}
          alreadyLinked={googleLinked}
        />
      }
      footer={
        googleLinked
          ? "Google is already linked. Disconnect it below before linking a different Google account."
          : undefined
      }
    >
      <DataState
        state={state}
        resource="your connected accounts"
        align="start"
        compactError
        skeleton={
          <ListSkeleton rows={1} leading="none" trailing density="dense" />
        }
        empty={
          <EmptyState
            icon={LinkIcon}
            align="start"
            className="px-4"
            title="No linked accounts"
            description="Link a provider and you can sign in with it instead of typing a password."
          />
        }
      >
        <DataList aria-label="Connected accounts">
          {accounts.map((acct) => (
            <ConnectedAccountRow
              key={acct.id}
              acct={acct}
              onDisconnect={() => onDisconnect(acct)}
            />
          ))}
        </DataList>
      </DataState>
    </SettingsSection>
  );
}

// ── Connect Google button ──────────────────────────────────────────────────────

interface ConnectGoogleButtonProps {
  user: MaybeUserResource;
  disabled: boolean;
  alreadyLinked: boolean;
}

// Starts Clerk's Google link flow and hands the browser to the provider. The
// pending state belongs here because nothing else on the page reads it.
function ConnectGoogleButton({
  user,
  disabled,
  alreadyLinked,
}: ConnectGoogleButtonProps) {
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
      toast.error("Couldn't start the Google connect flow.");
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
      disabled={disabled || connecting || alreadyLinked}
      aria-busy={connecting}
    >
      <GoogleLogoIcon className="size-3.5 mr-1.5" />
      {connecting ? "Connecting…" : "Connect Google"}
    </Button>
  );
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
    <ItemRow
      padding="dense"
      aria-label={humanizeLabel(acct.provider)}
      leading={
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      }
      title={
        <span className="block truncate text-sm font-medium text-foreground">
          {/* `humanizeLabel` keeps brand casing ("github" → "GitHub") and never
              shows a raw provider slug. */}
          {humanizeLabel(acct.provider)}
        </span>
      }
      subtitle={
        <p className="truncate text-xs text-muted-foreground">
          {orDash(acct.emailAddress || acct.username)}
        </p>
      }
      trailing={
        <div className="flex items-center gap-2">
          <StatusBadge {...verificationMeta(acct.verification?.status)} />
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDisconnect}
          >
            Disconnect account
          </Button>
        </div>
      }
    />
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
          <span className="font-medium text-foreground">
            {target ? humanizeLabel(target.provider) : ""}
          </span>{" "}
          account? You can reconnect it later.
        </>
      }
      confirmLabel="Disconnect account"
      action={(acct) => acct.destroy()}
      successMessage="Account disconnected."
      errorMessage="Failed to disconnect account."
    />
  );
}
