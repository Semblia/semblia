"use client";

/**
 * ConnectIntegrationDialog — authorize a provider, then pick a destination.
 *
 * Two structural fixes:
 *   • the authorize step sat in its own `rounded-md border` box *inside* the
 *     dialog — a bounded surface inside a bounded surface. The dialog is the
 *     container; the steps group with stack gaps.
 *   • the destination list was a private copy of the picker in the edit dialog.
 *     Both now compose `ResourcePicker`, which owns the radio semantics and its
 *     own loading / empty / error states.
 *
 * P6 guard: a provider whose OAuth app is not configured cannot complete this
 * flow, so the dialog states that and offers no authorize control. The catalog
 * already refuses to open the dialog for such a provider; this is the second
 * line, because "cannot be done" should be true wherever it is reached from.
 */

import * as React from "react";
import { toast } from "sonner";
import { useReverification, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useCreateIntegrationConnection,
  useIntegrationResources,
} from "@/hooks/api";
import {
  type ProviderSpec,
  providerBlockedReason,
} from "./integration-providers";
import { ResourcePicker } from "./resource-picker";

export function ConnectIntegrationDialog({
  slug,
  spec,
  open,
  onOpenChange,
}: {
  slug: string;
  spec: ProviderSpec | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateIntegrationConnection(slug);
  const { isLoaded, user } = useUser();
  type CreateExternalAccountParams = Parameters<
    NonNullable<typeof user>["createExternalAccount"]
  >[0];
  const createExternalAccount = useReverification(
    (params: CreateExternalAccountParams) =>
      user?.createExternalAccount(params),
  );
  const [selectedResourceId, setSelectedResourceId] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    if (open) setSelectedResourceId(null);
  }, [open, spec]);

  const blocked = spec ? providerBlockedReason(spec) : null;
  const isAuthorized =
    isLoaded &&
    spec !== null &&
    Boolean(
      user?.externalAccounts.some(
        (account) => account.provider === spec.id.toLowerCase(),
      ),
    );

  const resourcesQuery = useIntegrationResources(
    slug,
    spec?.id ?? null,
    undefined,
    { enabled: open && isAuthorized && !blocked },
  );
  const resources = React.useMemo(
    () => resourcesQuery.data?.items ?? [],
    [resourcesQuery.data],
  );
  const selectedResource =
    resources.find((resource) => resource.id === selectedResourceId) ?? null;

  if (!spec) return null;

  async function handleSubmit() {
    if (!spec || !selectedResource) return;
    try {
      await create.mutateAsync({
        provider: spec.id,
        scopes: spec.oauthScopes,
        config: selectedResource.config,
      });
      toast.success(`${spec.label} connected`, {
        description: "New responses are delivered to this destination.",
      });
      onOpenChange(false);
    } catch {
      // Rendered inline below, in the region the action was taken in.
    }
  }

  async function handleAuthorize() {
    if (!spec) return;
    try {
      const result = (await createExternalAccount({
        strategy: spec.oauthStrategy,
        additionalScopes: spec.oauthScopes,
        redirectUrl: window.location.href,
      } as CreateExternalAccountParams)) as
        | {
            verification?: {
              externalVerificationRedirectURL?: { href?: string };
            };
          }
        | undefined;
      const href =
        result?.verification?.externalVerificationRedirectURL?.href ?? null;
      if (href) {
        if (window.navigator.userAgent.includes("jsdom")) return;
        try {
          window.location.assign(href);
        } catch {
          // Navigation is not implemented in jsdom; browsers still redirect.
        }
      }
    } catch {
      toast.error(`Couldn't start ${spec.label} authorization.`);
    }
  }

  const Icon = spec.icon;
  const canSubmit = Boolean(
    selectedResource && isAuthorized && !blocked && !create.isPending,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background text-foreground">
              <Icon className="size-3.5" />
            </span>
            Connect {spec.label}
          </DialogTitle>
          <DialogDescription>{blocked ?? spec.blurb}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) handleSubmit();
          }}
          className="space-y-4"
        >
          {blocked ? null : isAuthorized ? (
            <ResourcePicker
              label={`${spec.label} destinations`}
              providerLabel={spec.label}
              resources={resources}
              selectedResourceId={selectedResourceId}
              query={resourcesQuery}
              onSelect={setSelectedResourceId}
            />
          ) : (
            <div className="space-y-2">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Semblia needs your permission before it can list destinations.
                You&apos;ll come back here once {spec.label} has confirmed it.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={handleAuthorize}
                disabled={!isLoaded}
              >
                Authorize {spec.label}
              </Button>
            </div>
          )}

          {create.isError && (
            <p role="alert" className="text-[11px] text-destructive">
              Couldn&apos;t connect {spec.label}. Choose another destination and
              try again.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!canSubmit}
              aria-busy={create.isPending}
            >
              {create.isPending ? "Connecting…" : `Connect ${spec.label}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
