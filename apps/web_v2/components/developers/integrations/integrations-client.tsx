"use client";

/**
 * IntegrationsClient — where responses go after Semblia has them.
 *
 * The old build had four hand-rolled bordered surfaces on one page: a card per
 * provider in a 2-up grid, a bordered box around the loading skeletons, a
 * dashed empty card, and a bordered box around the connection list. Two of them
 * nested inside `PageBody`'s own padding, and the provider cards were the worst
 * of it — a big inviting logo tile for Slack, Notion, and Linear, whose OAuth
 * applications are not configured on Semblia's Clerk instance. Clicking one led
 * to an "Authorize" button that fails inside Clerk with nothing the user can do
 * about it.
 *
 * Restructured:
 *   • one column, grouped by `Section`, everything on the page background
 *   • the provider catalog is a row list on the same anatomy as the import
 *     catalog, since it is the same job: pick a source, start a workflow
 *   • P6 — a provider that cannot be connected says so in a sentence and offers
 *     no control at all, rather than looking available and failing
 *   • the connection list owns its state through `DataState`, so a failed fetch
 *     is an error with a retry, not "No integrations connected"
 */

import * as React from "react";
import { toast } from "sonner";
import { PlugIcon } from "@phosphor-icons/react";
import type { V2IntegrationProvider } from "@workspace/types";
import { cn } from "@/lib/utils";
import {
  PageHeader,
  PageBody,
  Section,
  SectionStack,
  DataState,
  DataList,
  ListSkeleton,
  ItemRow,
  ItemActionRow,
  StatusBadge,
  RefreshingDataBadge,
  useDataState,
  type ItemAction,
  type StatusMeta,
} from "@/components/shared";
import {
  useIntegrationConnections,
  useEnableIntegrationConnection,
  useDisableIntegrationConnection,
  useRevokeIntegrationConnection,
  useCreateNativeIntegrationExport,
} from "@/hooks/api";
import { fmtCount } from "@/lib/format";
import {
  PROVIDERS,
  providerBlockedReason,
  type ProviderSpec,
} from "./integration-providers";
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

  function handleConnect(spec: ProviderSpec) {
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

  const connectable = PROVIDERS.filter((p) => p.oauthReady).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Integrations"
        description={
          connectionsQuery.data === undefined
            ? undefined
            : `${fmtCount(connections.length)} ${connections.length === 1 ? "connection" : "connections"} · ${fmtCount(connectable)} of ${fmtCount(PROVIDERS.length)} providers available`
        }
        actions={<RefreshingDataBadge show={state.isRefreshing} />}
      />

      <PageBody padding="bare" className="min-h-0 overflow-y-auto">
        <div className="px-4 py-6 sm:px-6 sm:py-8">
          <SectionStack>
            <Section
              title="Available integrations"
              description="Authorize a provider once, pick a destination Semblia discovers for you, and every new response is delivered there. Delivery is one-way — Semblia never reads back from these tools."
              id="integration-catalog"
            >
              {/* Static catalog, not a query: every provider Semblia
                  implements is listed here, in full, always. */}
              <DataList aria-label="Available integrations">
                {PROVIDERS.map((spec) => (
                  <ProviderRow
                    key={spec.id}
                    spec={spec}
                    connected={liveCount(spec.id)}
                    onConnect={handleConnect}
                  />
                ))}
              </DataList>
            </Section>

            <Section
              title="Connections"
              description="Each connection is one destination. Disable one to pause delivery without losing the destination; revoke it to disconnect Semblia entirely."
              divided
              id="integration-connections"
            >
              <DataState
                state={state}
                resource="your integrations"
                align="start"
                skeleton={<ListSkeleton rows={2} leading="square" trailing />}
                empty={
                  // Nothing connected yet is a normal state, not a failure —
                  // and the catalog above is already the one action, so this
                  // reassures and stops.
                  <p className="py-6 text-xs text-muted-foreground">
                    Nothing connected yet. Destinations you connect above appear
                    here with their delivery status.
                  </p>
                }
              >
                {/* The integrations route returns this project's complete set
                    — there is no paginated envelope, so no affordance. */}
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
            </Section>
          </SectionStack>
        </div>
      </PageBody>

      <ConnectIntegrationDialog
        slug={slug}
        spec={connectSpec}
        open={connectOpen}
        onOpenChange={setConnectOpen}
      />
    </div>
  );
}

/**
 * One provider in the catalog.
 *
 * P6 in its hardest form: a provider whose OAuth app is not configured cannot
 * be connected by anyone, by any route, today. It keeps its place in the list —
 * hiding it would make Semblia look like it has no Slack support at all — but
 * it is stated plainly, dimmed, and carries no control. An enabled "Connect"
 * that ends in a Clerk error is the defect this replaces.
 */
function ProviderRow({
  spec,
  connected,
  onConnect,
}: {
  spec: ProviderSpec;
  connected: number;
  onConnect: (spec: ProviderSpec) => void;
}) {
  const blocked = providerBlockedReason(spec);
  const Icon = spec.icon;

  const status: StatusMeta = blocked
    ? { label: "Not available yet", tone: "muted" }
    : connected > 0
      ? { label: "Connected", tone: "positive" }
      : { label: "Ready to connect", tone: "neutral" };

  const actions: ItemAction[] = blocked
    ? []
    : [
        {
          id: "connect",
          label: connected > 0 ? "Add destination" : `Connect ${spec.label}`,
          icon: PlugIcon,
          pinned: true,
          onSelect: () => onConnect(spec),
        },
      ];

  return (
    <ItemRow
      role="listitem"
      inactive={blocked !== null}
      padding="dense"
      aria-label={spec.label}
      leading={
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-foreground",
            // Not an inviting mark when it can't be used.
            blocked && "opacity-50 grayscale",
          )}
        >
          <Icon className="size-5" />
        </span>
      }
      title={
        <span className="text-sm font-medium text-foreground">
          {spec.label}
        </span>
      }
      subtitle={
        <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          {blocked ?? spec.blurb}
        </p>
      }
      metrics={
        connected > 0 ? (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {fmtCount(connected)}{" "}
            {connected === 1 ? "destination" : "destinations"}
          </span>
        ) : undefined
      }
      trailing={<StatusBadge {...status} />}
      actions={
        actions.length > 0 ? (
          <ItemActionRow actions={actions} size="sm" />
        ) : undefined
      }
    />
  );
}
