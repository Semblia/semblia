"use client";

/**
 * IntegrationsClient — where responses go after Semblia has them.
 *
 * The page leads with what is connected. The provider directory — most of it
 * describing providers that cannot be connected yet — used to be a permanent
 * tile wall above the list; it is now a picker dialog behind one
 * "Add integration" button, with the how-it-works disclaimer stated once
 * inside it. Connections are a full-bleed row list on the app grid.
 *
 *   • the connection list owns its state through `DataState`, so a failed
 *     fetch is an error with a retry, not "Nothing connected yet"
 *   • a provider that cannot be connected says so in a sentence inside the
 *     picker and offers no control at all, rather than looking available and
 *     failing inside Clerk (P6)
 */

import * as React from "react";
import { toast } from "sonner";
import { PlugsConnectedIcon, PlusIcon } from "@phosphor-icons/react";
import type { V2IntegrationProvider } from "@workspace/types";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  PageBody,
  DataState,
  DataList,
  EmptyState,
  GhostList,
  ListSkeleton,
  RefreshingDataBadge,
  useDataState,
} from "@/components/shared";
import {
  useIntegrationConnections,
  useEnableIntegrationConnection,
  useDisableIntegrationConnection,
  useRevokeIntegrationConnection,
  useCreateNativeIntegrationExport,
} from "@/hooks/api";
import { fmtCount } from "@/lib/format";
import { type ProviderSpec } from "./integration-providers";
import { AddIntegrationDialog } from "./add-integration-dialog";
import { ConnectIntegrationDialog } from "./connect-integration-dialog";
import { IntegrationConnectionRow } from "./integration-connection-item";

const TEST_EXPORT_BODY = {
  eventType: "submission.created" as const,
  payload: {
    title: "Test export from Semblia",
    summary: "This is a sample delivery to verify your integration.",
    authorName: "Semblia",
  },
};

export function IntegrationsClient({ slug }: { slug: string }) {
  const connectionsQuery = useIntegrationConnections(slug);
  const enableConnection = useEnableIntegrationConnection(slug);
  const disableConnection = useDisableIntegrationConnection(slug);
  const revokeConnection = useRevokeIntegrationConnection(slug);
  const sendTest = useCreateNativeIntegrationExport(slug);

  const [addOpen, setAddOpen] = React.useState(false);
  const [connectSpec, setConnectSpec] = React.useState<ProviderSpec | null>(
    null,
  );
  const [connectOpen, setConnectOpen] = React.useState(false);

  const connections = React.useMemo(
    () => connectionsQuery.data ?? [],
    [connectionsQuery.data],
  );
  const state = useDataState(connectionsQuery, { count: connections.length });
  const busy =
    enableConnection.isPending ||
    disableConnection.isPending ||
    revokeConnection.isPending;

  /**
   * Live connections per provider. Revoked connections are kept for the record
   * but are not a destination any more, so they don't count towards "connected".
   */
  const liveCount = React.useCallback(
    (provider: V2IntegrationProvider) =>
      connections.filter(
        (c) => c.provider === provider && c.status !== "REVOKED",
      ).length,
    [connections],
  );

  function handlePick(spec: ProviderSpec) {
    setAddOpen(false);
    setConnectSpec(spec);
    setConnectOpen(true);
  }

  function handleSendTest(connectionId: string) {
    sendTest.mutate(
      { connectionId, body: TEST_EXPORT_BODY },
      {
        onSuccess: () =>
          toast.success("Test export queued", {
            description: "Check the destination for the sample delivery.",
          }),
        onError: () => toast.error("Couldn't send the test export."),
      },
    );
  }

  function handleDisable(connectionId: string) {
    disableConnection.mutate(connectionId, {
      onSuccess: () => toast.success("Integration disabled"),
      onError: () => toast.error("Couldn't disable the integration."),
    });
  }

  function handleEnable(connectionId: string) {
    enableConnection.mutate(connectionId, {
      onSuccess: () => toast.success("Integration enabled"),
      onError: () => toast.error("Couldn't enable the integration."),
    });
  }

  function handleRevoke(connectionId: string) {
    revokeConnection.mutate(connectionId, {
      onSuccess: () => toast.success("Integration revoked"),
      onError: () => toast.error("Couldn't revoke the integration."),
    });
  }

  const firstRun = state.kind === "empty-first-run";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Integrations"
        description={
          connectionsQuery.data === undefined
            ? undefined
            : `${fmtCount(connections.length)} ${connections.length === 1 ? "connection" : "connections"}`
        }
        actions={
          <>
            <RefreshingDataBadge show={state.isRefreshing} />
            {/* On first run the empty state owns the single primary action. */}
            {!firstRun && (
              <Button
                size="sm"
                className="tactile gap-1.5 text-xs"
                onClick={() => setAddOpen(true)}
              >
                <PlusIcon className="size-3.5" weight="bold" aria-hidden />
                Add integration
              </Button>
            )}
          </>
        }
      />

      <PageBody padding="bare" className="min-h-0 overflow-y-auto pb-8">
        <DataState
          state={state}
          resource="your integrations"
          skeleton={<ListSkeleton rows={2} leading="square" trailing />}
          empty={
            <EmptyState
              icon={PlugsConnectedIcon}
              title="Nothing connected yet"
              description="Connect a tool once and every new response is delivered to the destination you pick."
              preview={<GhostList rows={2} leading="square" />}
              action={
                <Button
                  size="sm"
                  className="tactile gap-1.5 text-xs"
                  onClick={() => setAddOpen(true)}
                >
                  <PlusIcon className="size-3.5" weight="bold" aria-hidden />
                  Add integration
                </Button>
              }
            />
          }
        >
          {/* The integrations route returns this project's complete set —
              there is no paginated envelope, so no affordance. */}
          <DataList aria-label="Integration connections">
            {connections.map((connection) => (
              <IntegrationConnectionRow
                key={connection.id}
                slug={slug}
                connection={connection}
                busy={busy}
                onSendTest={handleSendTest}
                onEnable={handleEnable}
                onDisable={handleDisable}
                onRevoke={handleRevoke}
                isSendingTest={
                  sendTest.isPending &&
                  sendTest.variables?.connectionId === connection.id
                }
              />
            ))}
          </DataList>
        </DataState>
      </PageBody>

      <AddIntegrationDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        connectedCount={liveCount}
        onPick={handlePick}
      />

      <ConnectIntegrationDialog
        slug={slug}
        spec={connectSpec}
        open={connectOpen}
        onOpenChange={setConnectOpen}
      />
    </div>
  );
}
