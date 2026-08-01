"use client";

/**
 * AgentKeyDetailClient — one agent key, on the same page shape as an API key.
 *
 * This was the API-key detail screen's twin, four bordered panels deep, with a
 * "Last used" tile that rendered an em dash for a key that had simply never
 * been used — a claim of ignorance about a fact the record states plainly.
 *
 * It now composes the shared key detail layout. What stays specific to agent
 * keys: they are cut from a preset rather than hand-picked scopes, they are
 * never rotated (an agent's operator revokes and re-mints), and their activity
 * arrives on the project-wide actions feed rather than a per-key one.
 */

import * as React from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DataState,
  ListSkeleton,
  Section,
  SectionStack,
  useDataState,
} from "@/components/shared";
import { agentKeysPath } from "@/lib/routes";
import {
  useAgentAccessOverview,
  useAgentActions,
  useRevokeAgentKey,
} from "@/hooks/api";
import { KeyLifecycleActions } from "../access-keys/key-actions";
import {
  ACTIVITY_ANCHOR,
  KeyDetailLayout,
  KeyFacts,
  KeyScopes,
  SCOPES_ANCHOR,
} from "../access-keys/key-detail-shell";
import { buildUsageSeries, describeKey } from "../access-keys/key-model";
import { KeyActivityTable, KeyUsageChart } from "../access-keys/key-usage";
import { useNow } from "../access-keys/use-now";
import { findMatchingPreset } from "./agent-presets";

export function AgentKeyDetailClient({
  slug,
  keyId,
}: {
  slug: string;
  keyId: string;
}) {
  const now = useNow();
  const overviewQuery = useAgentAccessOverview(slug);
  const actionsQuery = useAgentActions(slug);
  const revokeMutation = useRevokeAgentKey(slug);

  const entry = React.useMemo(
    () => overviewQuery.data?.keys.find((key) => key.id === keyId) ?? null,
    [overviewQuery.data, keyId],
  );
  const row = React.useMemo(
    () => (entry ? { entry, state: describeKey(entry, now) } : null),
    [entry, now],
  );
  const preset = React.useMemo(
    () =>
      entry
        ? findMatchingPreset(entry.scopes, overviewQuery.data?.presets ?? [])
        : null,
    [entry, overviewQuery.data?.presets],
  );

  const state = useDataState(overviewQuery, { count: entry ? 1 : 0 });

  // The actions feed is project-wide; this page shows only the rows belonging
  // to this key, so the count that drives the state is the scoped one.
  const events = React.useMemo(
    () => (actionsQuery.data ?? []).filter((event) => event.apiKeyId === keyId),
    [actionsQuery.data, keyId],
  );
  const usageState = useDataState(actionsQuery, { count: events.length });
  const points = React.useMemo(
    () => (entry ? buildUsageSeries(events, entry, now) : []),
    [events, entry, now],
  );

  const handleRevoke = () => {
    revokeMutation.mutate(keyId, {
      onSuccess: () => toast.success("Agent key revoked"),
      onError: () => toast.error("Couldn't revoke the agent key. Try again."),
    });
  };

  return (
    <KeyDetailLayout
      row={row}
      state={state}
      resource="this agent key"
      fallbackTitle="Agent key"
      backHref={agentKeysPath(slug)}
      backLabel="Back to agent keys"
      actions={
        row ? (
          <KeyLifecycleActions
            state={row.state}
            keyName={row.entry.name}
            busy={revokeMutation.isPending}
            onRevoke={handleRevoke}
          />
        ) : undefined
      }
    >
      {row && (
        <SectionStack>
          <Section
            title="Usage"
            description="Counted since the key was issued."
          >
            <KeyFacts
              row={row}
              extra={[
                { term: "Preset", value: preset?.label ?? "Custom scopes" },
              ]}
            />
          </Section>

          <Section
            id={ACTIVITY_ANCHOR}
            title="Requests per day"
            description="Days with no requests are drawn as zero rather than skipped, so a quiet week reads as a quiet week."
            divided
          >
            <DataState
              state={usageState}
              resource="this agent's activity"
              align="start"
              compactError
              skeleton={
                <div className="space-y-4">
                  <Skeleton className="animate-shimmer h-44 w-full rounded-lg" />
                  <ListSkeleton
                    rows={3}
                    leading="none"
                    trailing
                    density="dense"
                  />
                </div>
              }
              empty={
                <p className="text-xs leading-relaxed text-muted-foreground">
                  No requests yet. Once the agent authenticates with this key,
                  each day it was used shows up here.
                </p>
              }
            >
              <div className="space-y-6">
                <KeyUsageChart points={points} />
                <KeyActivityTable events={events} />
              </div>
            </DataState>
          </Section>

          <Section
            id={SCOPES_ANCHOR}
            title="Scopes"
            description={
              preset
                ? preset.description
                : "These scopes no longer match any preset, so this key was either cut before the presets changed or edited directly."
            }
            divided
          >
            <KeyScopes scopes={row.entry.scopes} />
          </Section>
        </SectionStack>
      )}
    </KeyDetailLayout>
  );
}
