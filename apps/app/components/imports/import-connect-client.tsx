"use client";

/**
 * Connect a platform — the one import method that keeps working after today.
 *
 * Two steps: pick the platform from a grid of marks, then set it up. Picking
 * drills into `?source=<key>` — a URL, so the OAuth round-trip and a refresh
 * both land back on the same screen.
 *
 * Two things the first build got wrong, both about telling the truth:
 *
 *  1. Every tile said "Setup required" forever. That string comes from the
 *     catalog's `availability`, which is a fact about *Semblia* — whether the
 *     provider's OAuth app is configured on our side — and not about this
 *     project. A project that had already connected X was still told to set X
 *     up. A tile now leads with what this project has: "Collecting", "Paused",
 *     or the provider's own error; the catalog's caveat only speaks for a
 *     source nobody here has connected.
 *  2. The whole answer to "where does my data come from, and how often?" lived
 *     behind a drill-in you had to already know to open. The connections a
 *     project has are the answer, so they are the first thing on the page —
 *     each with its resource, its schedule, and its controls.
 */

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  V2ImportCatalogSourceDTO,
  V2ImportConnectionDTO,
} from "@workspace/types";
import {
  DataState,
  GridSkeleton,
  ListSkeleton,
  useDataState,
} from "@/components/shared";
import { useImportConnections } from "@/hooks/api";
import { useConnectedImportDialogController } from "./connected-import-dialog-controller";
import { ConnectedImportContent } from "./connected-import-dialog-sections";
import { ConnectionRow } from "./connected-import-connection-row";
import { ImportMethodShell, MethodAside } from "./method-shell";
import { SourceMark } from "./source-icons";
import { SourceChip, SourcePicker, type SourceStatus } from "./source-picker";
import { useMethodSources } from "./use-method-sources";
import { importConnectPath } from "@/lib/routes";

const STEPS = ["Choose a platform", "Connect it"] as const;

export function ImportConnectClient({ slug }: { slug: string }) {
  const { sources, state } = useMethodSources(slug, "CONNECTED_API");
  const connectionsQuery = useImportConnections({ slug });
  const connections = React.useMemo(
    () => connectionsQuery.data ?? [],
    [connectionsQuery.data],
  );
  const searchParams = useSearchParams();
  const router = useRouter();

  const sourceKey = searchParams.get("source");
  const source = sourceKey
    ? (sources.find((s) => s.key === sourceKey) ?? null)
    : null;

  if (source) {
    return (
      <ConnectDrillIn
        slug={slug}
        source={source}
        onBack={() => router.push(importConnectPath(slug))}
      />
    );
  }

  const sharedReason = dominantReason(sources, connections);

  return (
    <ImportMethodShell
      slug={slug}
      title="Connect a platform"
      description="Sign in once — Semblia imports new proof every six hours, pending review."
      steps={STEPS}
      currentStep={0}
      aside={<ConnectAside />}
    >
      <div className="space-y-9">
        <CollectingSection
          slug={slug}
          sources={sources}
          query={connectionsQuery}
          connections={connections}
        />

        <DataState
          state={state}
          resource="connectable platforms"
          align="start"
          skeleton={<GridSkeleton tiles={5} />}
        >
          <SourcePicker
            sources={sources}
            label={
              connections.length > 0
                ? "Add another platform"
                : "Which platform?"
            }
            note={sharedReason}
            statusFor={(s) => connectionStatus(connections, s.key)}
            onPick={(s) => router.push(importConnectPath(slug, s.key))}
          />
        </DataState>
      </div>
    </ImportMethodShell>
  );
}

// ── What this project is already collecting ─────────────────────────────────

/**
 * The connections that exist, whatever source they belong to. This is the
 * page's answer to "where is my data coming from, and how often?", so it leads
 * rather than hiding one level down: a connection names its resource (the
 * account, page, channel or listing Semblia reads), when it last ran, and
 * carries the controls that change both.
 *
 * With nothing connected it says nothing at all. An empty "you have no
 * connections" panel above a grid whose entire job is to create the first one
 * is a sentence the grid already speaks.
 */
function CollectingSection({
  slug,
  sources,
  query,
  connections,
}: {
  slug: string;
  sources: V2ImportCatalogSourceDTO[];
  query: ReturnType<typeof useImportConnections>;
  connections: V2ImportConnectionDTO[];
}) {
  const state = useDataState(query, { count: connections.length });
  if (state.kind === "empty-first-run") return null;

  return (
    <section aria-labelledby="collecting-heading" className="space-y-3">
      <div>
        <h2
          id="collecting-heading"
          className="text-[13px] font-medium tracking-tight text-foreground"
        >
          Collecting now
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Each connection reads one place, on a six-hour schedule, into this
          project only.
        </p>
      </div>
      <DataState
        state={state}
        resource="your connections"
        align="start"
        compactError
        skeleton={<ListSkeleton rows={2} leading="square" trailing />}
      >
        <ul className="divide-y divide-border border-y border-border">
          {connections.map((connection) => (
            <li key={connection.id} className="flex items-start gap-3 px-1">
              <span className="pt-3.5">
                <SourceMark
                  sourceKey={connection.sourceKey}
                  label={sourceLabel(sources, connection.sourceKey)}
                  size="sm"
                />
              </span>
              <div className="min-w-0 flex-1">
                <ConnectionRow
                  projectId={slug}
                  sourceLabel={sourceLabel(sources, connection.sourceKey)}
                  connection={connection}
                />
              </div>
            </li>
          ))}
        </ul>
      </DataState>
    </section>
  );
}

function sourceLabel(sources: V2ImportCatalogSourceDTO[], key: string): string {
  return sources.find((s) => s.key === key)?.label ?? key;
}

/**
 * What a tile should say about this project's relationship with the source.
 * `null` hands the tile back to the catalog's own availability.
 */
function connectionStatus(
  connections: V2ImportConnectionDTO[],
  sourceKey: string,
): SourceStatus | null {
  const mine = connections.filter((c) => c.sourceKey === sourceKey);
  if (mine.length === 0) return null;

  const failing = mine.find((c) => c.enabled && c.lastErrorCode !== null);
  if (failing) return { label: "Needs attention", tone: "critical" };

  const live = mine.filter((c) => c.enabled);
  if (live.length === 0) return { label: "Paused", tone: "neutral" };

  return {
    label: live.length > 1 ? `Collecting · ${live.length}` : "Collecting",
    tone: "positive",
  };
}

/**
 * The reason most providers share, when enough of them repeat it — and only
 * for the sources it still applies to. Once a project is connected somewhere,
 * a blanket "OAuth setup is required" above the grid contradicts the tile
 * beside it.
 */
function dominantReason(
  sources: V2ImportCatalogSourceDTO[],
  connections: V2ImportConnectionDTO[],
): string | null {
  const connected = new Set(connections.map((c) => c.sourceKey));
  const unconnected = sources.filter((s) => !connected.has(s.key));
  const [best, bestCount] = mostRepeated(reasonCounts(unconnected));
  return bestCount >= 3 ? best : null;
}

function reasonCounts(
  sources: V2ImportCatalogSourceDTO[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const source of sources) {
    if (!source.reason) continue;
    counts.set(source.reason, (counts.get(source.reason) ?? 0) + 1);
  }
  return counts;
}

function mostRepeated(counts: Map<string, number>): [string | null, number] {
  let best: string | null = null;
  let bestCount = 0;
  for (const [reason, count] of counts) {
    if (count > bestCount) {
      best = reason;
      bestCount = count;
    }
  }
  return [best, bestCount];
}

/** The rules that govern every connection, stated once beside the grid. */
function ConnectAside() {
  return (
    <MethodAside title="How connected imports work">
      <p>
        You authorize the platform once. Semblia reads the one account, page,
        channel or listing you pick — never the whole account.
      </p>
      <p>
        New proof is checked every six hours. Everything that arrives is private
        and pending your review; nothing is published automatically.
      </p>
      <p>
        Access tokens stay with Clerk. Pausing a connection stops the schedule
        and keeps what it already imported.
      </p>
    </MethodAside>
  );
}

// ── One provider ────────────────────────────────────────────────────────────

function ConnectDrillIn({
  slug,
  source,
  onBack,
}: {
  slug: string;
  source: V2ImportCatalogSourceDTO;
  onBack: () => void;
}) {
  const controller = useConnectedImportDialogController({
    slug,
    source,
    open: true,
  });

  return (
    <ImportMethodShell
      slug={slug}
      title={`Connect ${source.label}`}
      description="Choose what Semblia may read; imported proof stays pending until you review it."
      backHref={importConnectPath(slug)}
      backLabel="All platforms"
      steps={STEPS}
      currentStep={1}
      measure
      aside={<ConnectAside />}
    >
      <div
        aria-busy={controller.connectionsQuery.isPending}
        className="space-y-6"
      >
        <SourceChip
          source={source}
          onChange={onBack}
          changeLabel="Change platform"
        />
        <ConnectedImportContent
          controller={controller}
          slug={slug}
          source={source}
          onClose={onBack}
        />
      </div>
    </ImportMethodShell>
  );
}
