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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PageHeader,
  PageBody,
  Section,
  SectionStack,
  DataState,
  DataList,
  ListSkeleton,
  RefreshingDataBadge,
  useDataState,
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

/** "Slack, Notion and Linear" — a readable list, not a comma-joined array. */
function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

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

  /**
   * Providers whose OAuth app Semblia has not configured. Each one carries the
   * same sentence differing only by its own name, so three tiles printed three
   * near-identical paragraphs — repetition the reader has to parse to discover
   * it says nothing new. The tile keeps its "Not available yet" state and its
   * blurb (what the integration is *for*, which is still useful); the *why* is
   * stated once for the catalog, naming exactly which providers it covers.
   */
  const blockedProviders = React.useMemo(
    () => PROVIDERS.filter((spec) => providerBlockedReason(spec) !== null),
    [],
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
              description={
                <>
                  Authorize a provider once, pick a destination Semblia
                  discovers for you, and every new response is delivered there.
                  Delivery is one-way — Semblia never reads back from these
                  tools.
                  {blockedProviders.length > 0 && (
                    <>
                      {" "}
                      {listNames(blockedProviders.map((p) => p.label))}{" "}
                      {blockedProviders.length === 1 ? "has" : "have"} no
                      Semblia app configured yet, so authorizing{" "}
                      {blockedProviders.length === 1 ? "it" : "them"} would fail
                      — {blockedProviders.length === 1 ? "it" : "they"} appear
                      here as connectable once that setup is done.
                    </>
                  )}
                </>
              }
              id="integration-catalog"
            >
              {/* Static catalog, not a query: every provider Semblia
                  implements is listed here, in full, always. */}
              <ul
                aria-label="Available integrations"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {PROVIDERS.map((spec) => (
                  <ProviderRow
                    key={spec.id}
                    spec={spec}
                    connected={liveCount(spec.id)}
                    onConnect={handleConnect}
                  />
                ))}
              </ul>
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

  // A provider directory is the same shape as the import-source directory, and
  // reads the same way: a tile whose state sits beside its name rather than a
  // full-width row with a badge parked 800px away and its action on a line of
  // its own. `hideReason` drops the shared "app isn't set up yet" sentence,
  // which was printed verbatim under three consecutive providers.
  return (
    <li
      className={cn(
        "flex min-w-0 flex-col rounded-lg border border-border bg-card p-3.5 transition-colors duration-(--duration-base)",
        blocked ? "opacity-70" : "hover:border-foreground/20",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-foreground",
            // Not an inviting mark when it can't be used.
            blocked && "opacity-50 grayscale",
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-foreground">
            {spec.label}
          </span>
          <span className="block text-[11px] text-muted-foreground">
            {connected > 0
              ? `${fmtCount(connected)} ${connected === 1 ? "destination" : "destinations"}`
              : status.label}
          </span>
        </span>
      </div>

      <p className="mt-2 min-h-[2.5rem] text-[11px] leading-[1.45] text-muted-foreground">
        {spec.blurb}
      </p>

      <div className="mt-1">
        {!blocked ? (
          <Button
            size="sm"
            variant={connected > 0 ? "outline" : "default"}
            className={cn(
              "h-7 gap-1.5 px-2.5 text-[11px]",
              !connected && "ink-raised",
            )}
            onClick={() => onConnect(spec)}
          >
            <PlugIcon className="size-3.5" weight="bold" aria-hidden />
            {/* Named, not bare. "Connect" alone in a grid of four tiles is
                ambiguous the moment the tile scrolls out of view or is read
                aloud — right-column actions are Verb + Noun. */}
            {connected > 0 ? "Add destination" : `Connect ${spec.label}`}
          </Button>
        ) : (
          <span className="text-[11px] text-muted-foreground/70">
            Nothing to do yet
          </span>
        )}
      </div>
    </li>
  );
}
