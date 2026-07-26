"use client";

import * as React from "react";
import { useReverification, useUser } from "@clerk/nextjs";
import type {
  V2ImportCatalogSourceDTO,
  V2ImportProviderResourceDTO,
} from "@workspace/types";
import { toast } from "sonner";
import {
  useCreateImportConnection,
  useImportConnections,
  useImportProviderResources,
} from "@/hooks/api";
import {
  asConnectedSourceKey,
  hasExpectedOAuthStrategy,
  hasScopes,
  navigateToVerification,
  oauthProvider,
} from "@/components/imports/connected-import-helpers";

export type ConnectedImportDialogControllerInput = {
  slug: string;
  source: V2ImportCatalogSourceDTO | null;
  open: boolean;
};

type ClerkUser = NonNullable<ReturnType<typeof useUser>["user"]>;
type ExternalAccount = ClerkUser["externalAccounts"][number];
type CreateExternalAccountParams = Parameters<
  ClerkUser["createExternalAccount"]
>[0];
type ReauthorizeParams = Parameters<ExternalAccount["reauthorize"]>[0];
type AuthorizationResult =
  | {
      verification?: {
        externalVerificationRedirectURL?: { href?: string } | null;
      } | null;
    }
  | null
  | undefined;
type ConnectionSubmission = {
  source: V2ImportCatalogSourceDTO | null;
  sourceKey: string | null;
  selectedResource: V2ImportProviderResourceDTO | undefined;
  rightsConfirmed: boolean;
  isPending: boolean;
};
type ReadyConnectionSubmission = ConnectionSubmission & {
  source: V2ImportCatalogSourceDTO;
  sourceKey: string;
  selectedResource: V2ImportProviderResourceDTO;
  rightsConfirmed: true;
  isPending: false;
};

function hasOAuthStrategy(
  source: V2ImportCatalogSourceDTO | null,
): source is V2ImportCatalogSourceDTO & { oauthStrategy: string } {
  return Boolean(source?.oauthStrategy);
}

async function beginProviderAuthorization({
  accountToReauthorize,
  createExternalAccount,
  reauthorizeExternalAccount,
  source,
  requiredScopes,
}: {
  accountToReauthorize: ExternalAccount | null;
  createExternalAccount: (
    params: CreateExternalAccountParams,
  ) => Promise<AuthorizationResult>;
  reauthorizeExternalAccount: (
    account: ExternalAccount,
    params: ReauthorizeParams,
  ) => Promise<AuthorizationResult>;
  source: V2ImportCatalogSourceDTO & { oauthStrategy: string };
  requiredScopes: string[];
}) {
  const redirectUrl = window.location.href;
  if (accountToReauthorize) {
    return reauthorizeExternalAccount(accountToReauthorize, {
      additionalScopes: requiredScopes,
      redirectUrl,
    } as ReauthorizeParams);
  }
  return createExternalAccount({
    strategy: source.oauthStrategy as CreateExternalAccountParams["strategy"],
    additionalScopes:
      requiredScopes as CreateExternalAccountParams["additionalScopes"],
    redirectUrl,
  });
}

function canSubmitConnection(
  input: ConnectionSubmission,
): input is ReadyConnectionSubmission {
  const { source, sourceKey, selectedResource, rightsConfirmed, isPending } =
    input;
  return [
    source,
    sourceKey,
    selectedResource,
    rightsConfirmed,
    !isPending,
  ].every(Boolean);
}

export function useConnectedImportDialogController({
  slug,
  source,
  open,
}: ConnectedImportDialogControllerInput) {
  const { isLoaded: isClerkLoaded, user } = useUser();

  const createExternalAccount = useReverification(
    (params: CreateExternalAccountParams) =>
      user?.createExternalAccount(params),
  );
  const reauthorizeExternalAccount = useReverification(
    (account: ExternalAccount, params: ReauthorizeParams) =>
      account.reauthorize(params),
  );
  const sourceKey = asConnectedSourceKey(source?.key);
  const hasExpectedStrategy = hasExpectedOAuthStrategy(source, sourceKey);
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
  const connectionsQuery = useImportConnections({ slug });
  const createConnection = useCreateImportConnection({ slug });
  const [resourceCursor, setResourceCursor] = React.useState<
    string | undefined
  >(undefined);
  const resourcesQuery = useImportProviderResources({
    slug,
    provider: sourceKey,
    params: resourceCursor ? { cursor: resourceCursor } : undefined,
    options: { enabled: open && isAuthorized && sourceKey !== null },
  });
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
  const setupUnavailable =
    sourceKey === null ||
    !source?.modes.includes("CONNECTED_API") ||
    !hasExpectedStrategy ||
    provider === null;

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

  async function authorizeProvider() {
    if (setupUnavailable) return;
    if (!user) return;
    if (!hasOAuthStrategy(source)) return;
    setAuthorizationError(null);
    setIsAuthorizing(true);
    try {
      const result = await beginProviderAuthorization({
        accountToReauthorize,
        createExternalAccount,
        reauthorizeExternalAccount,
        source,
        requiredScopes,
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
    const submission = {
      source,
      sourceKey,
      selectedResource,
      rightsConfirmed,
      isPending: createConnection.isPending,
    };
    if (!canSubmitConnection(submission)) return;
    try {
      await createConnection.mutateAsync({
        sourceKey: submission.sourceKey,
        resourceId: submission.selectedResource.id,
        rightsConfirmed: true,
        autoSyncEnabled,
      });
      await connectionsQuery.refetch();
      setSelectedResourceId("");
      setRightsConfirmed(false);
      setAutoSyncEnabled(true);
      setIsAdding(false);
      toast.success(`${submission.source.label} connected`, {
        description: `${submission.selectedResource.label} is ready to import. New proof stays private until reviewed.`,
      });
    } catch {
      // The bounded error state is rendered below.
    }
  }

  return {
    isClerkLoaded,
    hasUser: user !== null,
    sourceKey,
    requiredScopes,
    accountToReauthorize,
    isAuthorized,
    connectionsQuery,
    createConnection,
    resourcesQuery,
    resources,
    selectedResource,
    selectedResourceId,
    rightsConfirmed,
    autoSyncEnabled,
    isAdding,
    isAuthorizing,
    authorizationError,
    autoSyncId,
    rightsId,
    sourceConnections,
    showSetup,
    nextCursor: resourcesQuery.data?.nextCursor ?? null,
    resourceCursor,
    setupUnavailable,
    authorizeProvider,
    submitConnection,
    setResourceCursor,
    setSelectedResourceId,
    setRightsConfirmed,
    setAutoSyncEnabled,
    setIsAdding,
  };
}
