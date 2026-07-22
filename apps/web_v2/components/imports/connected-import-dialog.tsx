"use client";

import * as React from "react";
import { useReverification, useUser } from "@clerk/nextjs";
import {
  ArrowLeftIcon,
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  LinkSimpleIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import type {
  V2ImportCatalogSourceDTO,
  V2ImportConnectionDTO,
  V2ImportProviderResourceDTO,
} from "@workspace/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  useCreateImportConnection,
  useDeleteImportConnection,
  useDisableImportConnection,
  useEnableImportConnection,
  useImportConnections,
  useImportProviderResources,
  useSyncImportConnection,
  useUpdateImportConnection,
} from "@/hooks/api";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const CONNECTED_SOURCE_KEYS = [
  "x",
  "linkedin",
  "youtube",
  "google-business",
  "google-play",
] as const;

type ConnectedSourceKey = (typeof CONNECTED_SOURCE_KEYS)[number];

const CONNECTED_OAUTH_STRATEGIES: Readonly<Record<ConnectedSourceKey, string>> =
  {
    x: "oauth_x",
    linkedin: "oauth_linkedin",
    youtube: "oauth_google",
    "google-business": "oauth_google",
    "google-play": "oauth_google",
  };

function asConnectedSourceKey(
  value: string | undefined,
): ConnectedSourceKey | null {
  return CONNECTED_SOURCE_KEYS.find((key) => key === value) ?? null;
}

function oauthProvider(strategy: string | null | undefined) {
  return strategy?.startsWith("oauth_") ? strategy.slice(6) : null;
}

function scopeSet(scopes: string | null | undefined) {
  return new Set(
    (scopes ?? "")
      .split(/[\s,]+/)
      .map((scope) => scope.trim().toLocaleLowerCase())
      .filter(Boolean),
  );
}

function hasScopes(
  approvedScopes: string | null | undefined,
  requiredScopes: readonly string[],
) {
  const approved = scopeSet(approvedScopes);
  return requiredScopes.every((scope) =>
    approved.has(scope.toLocaleLowerCase()),
  );
}

function resourceNoun(sourceKey: string | undefined) {
  return (
    {
      x: "profile",
      linkedin: "profile",
      youtube: "channel",
      "google-business": "location",
      "google-play": "app",
    }[sourceKey ?? ""] ?? "source"
  );
}

function navigateToVerification(href: string | undefined) {
  if (!href || window.navigator.userAgent.includes("jsdom")) return;
  try {
    window.location.assign(href);
  } catch {
    // JSDOM does not implement navigation. Browsers do.
  }
}

type ConnectedImportDialogProps = {
  source: V2ImportCatalogSourceDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & ({ projectId: string; slug?: never } | { projectId?: never; slug: string });

export function ConnectedImportDialog(props: ConnectedImportDialogProps) {
  const { source, open, onOpenChange } = props;
  const projectId = props.projectId ?? props.slug;
  const { isLoaded: isClerkLoaded, user } = useUser();
  type ClerkUser = NonNullable<typeof user>;
  type ExternalAccount = ClerkUser["externalAccounts"][number];
  type CreateExternalAccountParams = Parameters<
    ClerkUser["createExternalAccount"]
  >[0];
  type ReauthorizeParams = Parameters<ExternalAccount["reauthorize"]>[0];

  const createExternalAccount = useReverification(
    (params: CreateExternalAccountParams) =>
      user?.createExternalAccount(params),
  );
  const reauthorizeExternalAccount = useReverification(
    (account: ExternalAccount, params: ReauthorizeParams) =>
      account.reauthorize(params),
  );

  const sourceKey = asConnectedSourceKey(source?.key);
  const hasExpectedStrategy =
    sourceKey !== null &&
    source?.oauthStrategy === CONNECTED_OAUTH_STRATEGIES[sourceKey];
  const provider = hasExpectedStrategy
    ? oauthProvider(source?.oauthStrategy)
    : null;
  const requiredScopes = source?.requiredScopes ?? [];
  const matchingAccounts =
    user?.externalAccounts.filter((account) => account.provider === provider) ??
    [];
  const authorizedAccount =
    matchingAccounts.find(
      (account) =>
        account.verification?.status === "verified" &&
        hasScopes(account.approvedScopes, requiredScopes),
    ) ?? null;
  const accountToReauthorize = authorizedAccount ?? matchingAccounts[0] ?? null;
  const isAuthorized = authorizedAccount !== null;

  const connectionsQuery = useImportConnections(projectId);
  const createConnection = useCreateImportConnection(projectId);
  const [resourceCursor, setResourceCursor] = React.useState<
    string | undefined
  >(undefined);
  const resourcesQuery = useImportProviderResources(
    projectId,
    sourceKey,
    resourceCursor ? { cursor: resourceCursor } : undefined,
    { enabled: open && isAuthorized && sourceKey !== null },
  );
  const [resources, setResources] = React.useState<
    V2ImportProviderResourceDTO[]
  >([]);
  const [selectedResourceId, setSelectedResourceId] = React.useState("");
  const [rightsConfirmed, setRightsConfirmed] = React.useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = React.useState(true);
  const [isAdding, setIsAdding] = React.useState(false);
  const [isAuthorizing, setIsAuthorizing] = React.useState(false);
  const [authorizationError, setAuthorizationError] = React.useState<
    string | null
  >(null);
  const autoSyncId = React.useId();
  const rightsId = React.useId();

  const sourceConnections = (connectionsQuery.data ?? []).filter(
    (connection) => connection.sourceKey === source?.key,
  );
  const showSetup =
    connectionsQuery.isSuccess && (sourceConnections.length === 0 || isAdding);
  const selectedResource = resources.find(
    (resource) => resource.id === selectedResourceId,
  );

  React.useEffect(() => {
    if (!open) return;
    setResourceCursor(undefined);
    setResources([]);
    setSelectedResourceId("");
    setRightsConfirmed(false);
    setAutoSyncEnabled(true);
    setIsAdding(false);
    setIsAuthorizing(false);
    setAuthorizationError(null);
    createConnection.reset();
  }, [open, source?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const page = resourcesQuery.data;
    if (!page) return;
    setResources((current) => {
      const merged = new Map(
        current.map((resource) => [resource.id, resource] as const),
      );
      page.items.forEach((resource) => merged.set(resource.id, resource));
      return [...merged.values()];
    });
  }, [resourcesQuery.data]);

  React.useEffect(() => {
    if (selectedResourceId || resources.length !== 1) return;
    setSelectedResourceId(resources[0]?.id ?? "");
  }, [resources, selectedResourceId]);

  if (!source || !open) return null;

  const nextCursor = resourcesQuery.data?.nextCursor ?? null;
  const setupUnavailable =
    sourceKey === null ||
    !source.modes.includes("CONNECTED_API") ||
    !hasExpectedStrategy ||
    provider === null;

  async function authorizeProvider() {
    if (!source || !user || !source.oauthStrategy || setupUnavailable) return;
    setAuthorizationError(null);
    setIsAuthorizing(true);
    try {
      const redirectUrl = window.location.href;
      const result = accountToReauthorize
        ? await reauthorizeExternalAccount(accountToReauthorize, {
            additionalScopes: requiredScopes,
            redirectUrl,
          } as ReauthorizeParams)
        : await createExternalAccount({
            strategy:
              source.oauthStrategy as CreateExternalAccountParams["strategy"],
            additionalScopes:
              requiredScopes as CreateExternalAccountParams["additionalScopes"],
            redirectUrl,
          });
      const verificationUrl =
        result?.verification?.externalVerificationRedirectURL?.href;
      if (!verificationUrl) {
        setAuthorizationError(
          `${source.label} did not return an authorization page. Try again.`,
        );
        return;
      }
      navigateToVerification(verificationUrl);
    } catch {
      setAuthorizationError(
        `${source.label} authorization did not complete. Try again.`,
      );
    } finally {
      setIsAuthorizing(false);
    }
  }

  async function submitConnection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !source ||
      !sourceKey ||
      !selectedResource ||
      !rightsConfirmed ||
      createConnection.isPending
    ) {
      return;
    }
    try {
      await createConnection.mutateAsync({
        sourceKey,
        resourceId: selectedResource.id,
        rightsConfirmed: true,
        autoSyncEnabled,
      });
      await connectionsQuery.refetch();
      setSelectedResourceId("");
      setRightsConfirmed(false);
      setAutoSyncEnabled(true);
      setIsAdding(false);
      toast.success(`${source.label} connected`, {
        description: `${selectedResource.label} is ready to import. New proof stays private until reviewed.`,
      });
    } catch {
      // The bounded error state is rendered below.
    }
  }

  return (
    <section
      aria-labelledby="connected-import-workflow-title"
      aria-busy={connectionsQuery.isPending}
      className="bg-background"
    >
      <header className="border-b border-border pb-5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2"
          disabled={createConnection.isPending || isAuthorizing}
          onClick={() => onOpenChange(false)}
        >
          <ArrowLeftIcon aria-hidden />
          Back to sources
        </Button>
        <div className="mt-4 flex items-start gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-foreground">
            <LinkSimpleIcon className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2
              id="connected-import-workflow-title"
              className="text-base font-semibold tracking-tight"
            >
              Connect {source.label}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Choose what Semblia may read, then review imported proof before it
              is published.
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-6 py-6">
        {connectionsQuery.isPending ? (
          <div
            className="flex min-h-24 items-center justify-center gap-2 border-y border-border text-sm text-muted-foreground"
            aria-live="polite"
          >
            <Spinner />
            Loading connections
          </div>
        ) : connectionsQuery.isError ? (
          <div
            role="alert"
            className="flex flex-col gap-3 border-y border-border py-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="flex items-start gap-2">
              <WarningCircleIcon
                className="mt-0.5 size-4 shrink-0"
                aria-hidden
              />
              Connections could not load.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit text-foreground"
              onClick={() => void connectionsQuery.refetch()}
              disabled={connectionsQuery.isFetching}
            >
              {connectionsQuery.isFetching ? <Spinner /> : null}
              Try again
            </Button>
          </div>
        ) : sourceConnections.length > 0 ? (
          <section aria-labelledby="connected-imports-title">
            <div className="flex items-center justify-between gap-3 pb-2">
              <div>
                <h3
                  id="connected-imports-title"
                  className="text-xs font-medium"
                >
                  Connected destinations
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Each destination imports into this project only.
                </p>
              </div>
              {!isAdding ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAdding(true)}
                >
                  <PlusIcon aria-hidden />
                  Add destination
                </Button>
              ) : null}
            </div>
            <div className="divide-y divide-border border-y border-border">
              {sourceConnections.map((connection) => (
                <ConnectionRow
                  key={connection.id}
                  projectId={projectId}
                  sourceLabel={source.label}
                  connection={connection}
                />
              ))}
            </div>
          </section>
        ) : null}

        {showSetup ? (
          <form
            onSubmit={submitConnection}
            aria-busy={createConnection.isPending}
            className={cn(
              "space-y-4",
              sourceConnections.length > 0 && "border-t border-border pt-4",
            )}
          >
            <section
              aria-labelledby="authorize-import-source-title"
              aria-busy={isAuthorizing}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-md">
                  <h3
                    id="authorize-import-source-title"
                    className="text-xs font-medium"
                  >
                    1. Authorize read access
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Credentials stay in Clerk. Semblia never stores provider
                    access tokens or publishes imported proof automatically.
                  </p>
                </div>
                {!isClerkLoaded ? (
                  <span className="flex min-h-8 items-center gap-2 text-xs text-muted-foreground">
                    <Spinner />
                    Checking access
                  </span>
                ) : !user ? (
                  <span className="text-xs font-medium text-destructive">
                    Sign in to authorize this source.
                  </span>
                ) : isAuthorized ? (
                  <span className="inline-flex min-h-8 items-center gap-1.5 text-xs font-medium text-success">
                    <CheckCircleIcon
                      className="size-4"
                      weight="fill"
                      aria-hidden
                    />
                    Authorized
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void authorizeProvider()}
                    disabled={setupUnavailable || isAuthorizing}
                  >
                    {isAuthorizing ? (
                      <>
                        <Spinner /> Opening {source.label}
                      </>
                    ) : (
                      <>
                        {accountToReauthorize ? "Reauthorize" : "Authorize"}{" "}
                        {source.label}
                      </>
                    )}
                  </Button>
                )}
              </div>

              {requiredScopes.length > 0 ? (
                <details className="mt-2 text-xs text-muted-foreground">
                  <summary className="w-fit cursor-pointer rounded outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30">
                    View requested permissions
                  </summary>
                  <ul
                    className="mt-2 flex flex-wrap gap-1.5"
                    aria-label="Requested permissions"
                  >
                    {requiredScopes.map((scope) => (
                      <li
                        key={scope}
                        className="max-w-full rounded-md border border-border bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] break-all"
                      >
                        {scope}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}

              {setupUnavailable ? (
                <p role="alert" className="mt-2 text-xs text-destructive">
                  This source does not have a supported Clerk OAuth strategy.
                </p>
              ) : authorizationError ? (
                <p role="alert" className="mt-2 text-xs text-destructive">
                  {authorizationError}
                </p>
              ) : null}
            </section>

            {isAuthorized ? (
              <section
                aria-labelledby="choose-import-source-title"
                aria-busy={resourcesQuery.isFetching}
                className="border-t border-border pt-4"
              >
                <h3
                  id="choose-import-source-title"
                  className="text-xs font-medium"
                >
                  2. Choose a {resourceNoun(source.key)}
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Semblia imports only from the {resourceNoun(source.key)} you
                  select here.
                </p>

                {resourcesQuery.isPending && resources.length === 0 ? (
                  <div
                    className="mt-3 flex min-h-10 items-center gap-2 text-xs text-muted-foreground"
                    aria-live="polite"
                  >
                    <Spinner />
                    Loading available {resourceNoun(source.key)}s
                  </div>
                ) : resourcesQuery.isError && resources.length === 0 ? (
                  <div role="alert" className="mt-3 space-y-2">
                    <p className="text-xs text-destructive">
                      Available {resourceNoun(source.key)}s could not load.
                      Refresh provider access and try again.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void authorizeProvider()}
                      disabled={isAuthorizing}
                    >
                      {isAuthorizing ? (
                        <>
                          <Spinner /> Opening {source.label}
                        </>
                      ) : (
                        `Reauthorize ${source.label}`
                      )}
                    </Button>
                  </div>
                ) : resources.length === 0 ? (
                  <div className="mt-3 border-y border-border py-3">
                    <p className="text-xs leading-5 text-muted-foreground">
                      {nextCursor
                        ? `No importable ${resourceNoun(source.key)}s were on this page.`
                        : `No importable ${resourceNoun(source.key)}s were found for this account.`}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-1 -ml-2"
                      onClick={() => {
                        if (nextCursor) setResourceCursor(nextCursor);
                        else void authorizeProvider();
                      }}
                      disabled={
                        nextCursor ? resourcesQuery.isFetching : isAuthorizing
                      }
                    >
                      {nextCursor && resourcesQuery.isFetching ? (
                        <>
                          <Spinner /> Loading more
                        </>
                      ) : isAuthorizing ? (
                        <>
                          <Spinner /> Opening authorization
                        </>
                      ) : nextCursor ? (
                        "Continue to next page"
                      ) : (
                        "Refresh authorization"
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <label
                      htmlFor="connected-import-resource"
                      className="text-xs font-medium"
                    >
                      {source.label} {resourceNoun(source.key)}
                    </label>
                    <Select
                      value={selectedResourceId}
                      onValueChange={setSelectedResourceId}
                    >
                      <SelectTrigger
                        id="connected-import-resource"
                        className="h-9 w-full"
                      >
                        <SelectValue
                          placeholder={`Select a ${resourceNoun(source.key)}`}
                        />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        className="max-w-[calc(100vw-3rem)]"
                      >
                        {resources.map((resource) => (
                          <SelectItem key={resource.id} value={resource.id}>
                            <span className="max-w-[28rem] truncate">
                              {resource.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {resourceCursor && resourcesQuery.isPending ? (
                      <span className="flex min-h-7 items-center gap-2 text-xs text-muted-foreground">
                        <Spinner /> Loading more
                      </span>
                    ) : nextCursor ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="-ml-2"
                        onClick={() => setResourceCursor(nextCursor)}
                        disabled={resourcesQuery.isFetching}
                      >
                        {resourcesQuery.isFetching ? (
                          <>
                            <Spinner /> Loading more
                          </>
                        ) : (
                          "Load more"
                        )}
                      </Button>
                    ) : null}
                    {resourcesQuery.isError ? (
                      <div
                        role="alert"
                        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-destructive"
                      >
                        <span>More results could not load.</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void resourcesQuery.refetch()}
                        >
                          Try again
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )}
              </section>
            ) : null}

            {isAuthorized && resources.length > 0 ? (
              <section
                aria-labelledby="import-behavior-title"
                className="space-y-3 border-t border-border pt-4"
              >
                <div>
                  <h3
                    id="import-behavior-title"
                    className="text-xs font-medium"
                  >
                    3. Confirm import behavior
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    All imported proof enters the private review queue.
                  </p>
                </div>

                <div className="flex min-h-11 items-center justify-between gap-4 border-y border-border py-2.5">
                  <span>
                    <label
                      htmlFor={autoSyncId}
                      className="block text-xs font-medium"
                    >
                      Automatic sync
                    </label>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Periodically check this source for new proof.
                    </span>
                  </span>
                  <Switch
                    id={autoSyncId}
                    checked={autoSyncEnabled}
                    onCheckedChange={setAutoSyncEnabled}
                    aria-label="Enable automatic sync"
                  />
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 text-xs leading-5">
                  <Checkbox
                    id={rightsId}
                    checked={rightsConfirmed}
                    onCheckedChange={(checked) =>
                      setRightsConfirmed(checked === true)
                    }
                  />
                  <label htmlFor={rightsId}>
                    I confirm I have the right to import and use proof from this{" "}
                    {resourceNoun(source.key)}.
                  </label>
                </div>
              </section>
            ) : null}

            {createConnection.isError ? (
              <p role="alert" className="text-xs text-destructive">
                This connection could not be created. Check the selected source
                and try again.
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              {sourceConnections.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={createConnection.isPending}
                  onClick={() => setIsAdding(false)}
                >
                  Back
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={createConnection.isPending}
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={
                  !isAuthorized ||
                  !selectedResource ||
                  !rightsConfirmed ||
                  createConnection.isPending
                }
              >
                {createConnection.isPending ? (
                  <>
                    <Spinner /> Connecting
                  </>
                ) : (
                  `Connect ${source.label}`
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex justify-end border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={createConnection.isPending}
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export function ConnectionRow({
  projectId,
  sourceLabel,
  connection,
}: {
  projectId: string;
  sourceLabel: string;
  connection: V2ImportConnectionDTO;
}) {
  const update = useUpdateImportConnection(projectId, connection.id);
  const sync = useSyncImportConnection(projectId);
  const enable = useEnableImportConnection(projectId);
  const disable = useDisableImportConnection(projectId);
  const remove = useDeleteImportConnection(projectId);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const autoSyncId = React.useId();
  const publicUrl = connection.publicUrl;

  const isBusy =
    update.isPending ||
    sync.isPending ||
    enable.isPending ||
    disable.isPending ||
    remove.isPending;
  const actionFailed =
    update.isError ||
    sync.isError ||
    enable.isError ||
    disable.isError ||
    remove.isError;

  async function updateAutoSync(checked: boolean) {
    try {
      await update.mutateAsync({ autoSyncEnabled: checked });
      toast.success(
        checked ? "Automatic sync enabled" : "Automatic sync paused",
      );
    } catch {
      // The row-level error remains visible.
    }
  }

  async function syncNow() {
    try {
      await sync.mutateAsync(connection.id);
      toast.success("Sync queued", {
        description: `${connection.resourceLabel ?? sourceLabel} will import in the background.`,
      });
    } catch {
      // The row-level error remains visible.
    }
  }

  async function toggleEnabled() {
    try {
      if (connection.enabled) {
        await disable.mutateAsync(connection.id);
        toast.success("Connection paused");
      } else {
        await enable.mutateAsync(connection.id);
        toast.success("Connection enabled");
      }
    } catch {
      // The row-level error remains visible.
    }
  }

  async function deleteConnection() {
    try {
      await remove.mutateAsync(connection.id);
      setDeleteOpen(false);
      toast.success("Connection removed");
    } catch {
      // The row-level error remains visible.
    }
  }

  return (
    <article className="py-3" aria-busy={isBusy}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-medium">
              {connection.resourceLabel ?? sourceLabel}
            </h4>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                connection.enabled
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-warning/30 bg-warning/10 text-warning",
              )}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
              {connection.enabled ? "Active" : "Paused"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {connection.lastSyncedAt
              ? `Last synced ${timeAgo(connection.lastSyncedAt)}`
              : "Not synced yet"}
          </p>
          {publicUrl ? (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block truncate text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {publicUrl}
            </a>
          ) : null}
          {connection.lastErrorMessage ? (
            <p
              role="alert"
              className="mt-1 flex items-start gap-1.5 text-xs text-destructive"
            >
              <WarningCircleIcon
                className="mt-0.5 size-3.5 shrink-0"
                aria-hidden
              />
              <span>{connection.lastErrorMessage}</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void syncNow()}
            disabled={!connection.enabled || isBusy || deleteOpen}
          >
            {sync.isPending ? <Spinner /> : <ArrowsClockwiseIcon aria-hidden />}
            Sync now
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void toggleEnabled()}
            disabled={isBusy || deleteOpen}
          >
            {connection.enabled ? (
              <PauseIcon aria-hidden />
            ) : (
              <PlayIcon aria-hidden />
            )}
            {connection.enabled ? "Pause" : "Enable"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={isBusy || deleteOpen}
          >
            <TrashIcon aria-hidden />
            Remove
          </Button>
        </div>
      </div>

      <div className="mt-3 flex min-h-9 items-center justify-between gap-3 border-t border-border/70 pt-2.5 text-xs">
        <label htmlFor={autoSyncId}>
          Automatic sync
          {!connection.enabled ? (
            <span className="ml-1 text-muted-foreground">
              (connection paused)
            </span>
          ) : null}
        </label>
        <Switch
          id={autoSyncId}
          size="sm"
          checked={connection.autoSyncEnabled}
          onCheckedChange={(checked) => void updateAutoSync(checked)}
          disabled={!connection.enabled || isBusy || deleteOpen}
          aria-label={`Automatic sync for ${connection.resourceLabel ?? sourceLabel}`}
        />
      </div>

      {actionFailed ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          The connection could not be updated. Try again.
        </p>
      ) : null}

      {deleteOpen ? (
        <div
          role="alert"
          className="mt-3 flex flex-col gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-2">
            <WarningCircleIcon
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden
            />
            <p className="text-xs leading-5">
              Remove {connection.resourceLabel ?? sourceLabel}? Syncing stops,
              but imported proof stays in this project.
            </p>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteOpen(false)}
              disabled={remove.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void deleteConnection()}
              disabled={remove.isPending}
            >
              {remove.isPending ? (
                <>
                  <Spinner /> Removing
                </>
              ) : (
                "Remove connection"
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
