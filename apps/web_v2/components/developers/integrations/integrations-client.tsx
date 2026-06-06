"use client";

import * as React from "react";
import { toast } from "sonner";
import { PlugsConnectedIcon, PlusIcon } from "@phosphor-icons/react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { PageBody } from "@/components/shared";
import {
  useIntegrationConnections,
  useDisableIntegrationConnection,
  useCreateNativeIntegrationExport,
} from "@/hooks/api";
import { DeveloperShell } from "@/components/developers/developer-shell";
import { PROVIDERS, type ProviderSpec } from "./integration-providers";
import { ConnectIntegrationDialog } from "./connect-integration-dialog";
import {
  IntegrationConnectionRow,
  IntegrationConnectionRowSkeleton,
} from "./integration-connection-item";

const TEST_EXPORT_BODY = {
  eventType: "submission.created" as const,
  payload: {
    title: "Test export from Tresta",
    summary: "This is a sample delivery to verify your integration.",
    authorName: "Tresta",
  },
};

function ProviderCard({
  spec,
  onConnect,
}: {
  spec: ProviderSpec;
  onConnect: (spec: ProviderSpec) => void;
}) {
  const Icon = spec.icon;
  return (
    <button
      type="button"
      onClick={() => onConnect(spec)}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left",
        "transition-colors hover:border-brand/40 hover:bg-muted/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-foreground">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {spec.label}
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {spec.blurb}
        </span>
      </span>
      <PlusIcon
        className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
        weight="bold"
        aria-hidden
      />
    </button>
  );
}

export function IntegrationsClient({ slug }: { slug: string }) {
  const connectionsQuery = useIntegrationConnections(slug);
  const disableConnection = useDisableIntegrationConnection(slug);
  const sendTest = useCreateNativeIntegrationExport(slug);

  const [connectSpec, setConnectSpec] = React.useState<ProviderSpec | null>(
    null,
  );
  const [connectOpen, setConnectOpen] = React.useState(false);

  const connections = connectionsQuery.data ?? [];
  const isLoading = connectionsQuery.isLoading;

  function handleConnect(spec: ProviderSpec) {
    setConnectSpec(spec);
    setConnectOpen(true);
  }

  function handleSendTest(connectionId: string) {
    sendTest.mutate(
      { connectionId, body: TEST_EXPORT_BODY },
      {
        onSuccess: () => {
          toast.success("Test export queued", {
            description: "Check your destination for the sample delivery.",
          });
        },
        onError: () => {
          toast.error("Could not send test export. Please try again.");
        },
      },
    );
  }

  function handleDisable(connectionId: string) {
    disableConnection.mutate(connectionId, {
      onSuccess: () => toast.success("Integration disabled"),
      onError: () => toast.error("Could not disable integration."),
    });
  }

  return (
    <DeveloperShell
      slug={slug}
      active="integrations"
      description="Forward new responses to Slack, Notion, Linear, or GitHub. One-way native delivery — Tresta never reads back from these tools."
    >
      <PageBody padding="default" className="overflow-y-auto">
        {/* Available providers */}
        <section className="space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Connect an integration
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PROVIDERS.map((spec) => (
              <ProviderCard
                key={spec.id}
                spec={spec}
                onConnect={handleConnect}
              />
            ))}
          </div>
        </section>

        {/* Existing connections */}
        <section className="mt-8 space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Connections
          </h2>

          {isLoading ? (
            <div className="overflow-hidden rounded-xl border border-border divide-y divide-border">
              <IntegrationConnectionRowSkeleton />
              <IntegrationConnectionRowSkeleton />
            </div>
          ) : connections.length === 0 ? (
            <Empty className="border border-dashed py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PlugsConnectedIcon weight="bold" />
                </EmptyMedia>
                <EmptyTitle>No integrations connected</EmptyTitle>
                <EmptyDescription>
                  Connect Slack, Notion, Linear, or GitHub above to start
                  forwarding responses to your team&apos;s tools.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div
              role="list"
              aria-label="Integration connections"
              className="overflow-hidden rounded-xl border border-border divide-y divide-border"
            >
              {connections.map((connection) => (
                <div key={connection.id} role="listitem">
                  <IntegrationConnectionRow
                    slug={slug}
                    connection={connection}
                    onSendTest={handleSendTest}
                    onDisable={handleDisable}
                    isSendingTest={
                      sendTest.isPending &&
                      sendTest.variables?.connectionId === connection.id
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </PageBody>

      <ConnectIntegrationDialog
        slug={slug}
        spec={connectSpec}
        open={connectOpen}
        onOpenChange={setConnectOpen}
      />
    </DeveloperShell>
  );
}
