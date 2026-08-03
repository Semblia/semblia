"use client";

/**
 * Connect a platform — the one import method that keeps working after today.
 *
 * The list states each provider's real availability in the import service's
 * own words (P6 of the standing rules: never present a source that cannot
 * succeed as an inviting logo). Picking a provider drills into
 * `?source=<key>` — a URL, so the OAuth round-trip and a refresh both land
 * back on the same screen.
 */

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaretRightIcon } from "@phosphor-icons/react";
import type { V2ImportCatalogSourceDTO } from "@workspace/types";
import {
  DataState,
  ItemRow,
  ListSkeleton,
  StatusDot,
  importAvailabilityMeta,
} from "@/components/shared";
import { useConnectedImportDialogController } from "./connected-import-dialog-controller";
import { ConnectedImportContent } from "./connected-import-dialog-sections";
import { ImportMethodShell } from "./method-shell";
import { useMethodSources } from "./use-method-sources";
import { importConnectPath } from "@/lib/routes";

export function ImportConnectClient({ slug }: { slug: string }) {
  const { sources, state } = useMethodSources(slug, "CONNECTED_API");
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

  // The catalog attaches the same OAuth caveat to most providers. Said once,
  // above the list, it is information; under every row it is wallpaper (the
  // hoisting rule the old Import Center learned the hard way).
  const sharedReason = dominantReason(sources);

  return (
    <ImportMethodShell
      slug={slug}
      title="Connect a platform"
      description="Sign in once — Semblia imports new proof every six hours, pending review."
    >
      <DataState
        state={state}
        resource="connectable platforms"
        align="start"
        skeleton={<ListSkeleton rows={5} leading="none" trailing />}
      >
        {sharedReason && (
          <p className="mb-3 max-w-prose text-xs leading-relaxed text-muted-foreground">
            {sharedReason}
          </p>
        )}
        <div className="border-y border-border">
          {sources.map((s) => (
            <ProviderRow
              key={s.key}
              source={s}
              hideReason={s.reason === sharedReason}
              onPick={() =>
                router.push(`${importConnectPath(slug)}?source=${s.key}`)
              }
            />
          ))}
        </div>
      </DataState>
    </ImportMethodShell>
  );
}

/** The reason most providers share, when enough of them repeat it. */
function dominantReason(sources: V2ImportCatalogSourceDTO[]): string | null {
  const [best, bestCount] = mostRepeated(reasonCounts(sources));
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

function ProviderRow({
  source,
  hideReason,
  onPick,
}: {
  source: V2ImportCatalogSourceDTO;
  hideReason: boolean;
  onPick: () => void;
}) {
  const availability = importAvailabilityMeta(source.availability);
  const reason = hideReason ? null : source.reason;
  return (
    <ItemRow
      onClick={onPick}
      padding="dense"
      aria-label={`Connect ${source.label}`}
      title={
        <span className="text-[13px] font-medium text-foreground">
          {source.label}
        </span>
      }
      subtitle={
        reason ? (
          <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
            {reason}
          </p>
        ) : undefined
      }
      trailing={
        <div className="flex items-center gap-3">
          <StatusDot label={availability.label} tone={availability.tone} />
          <CaretRightIcon
            className="size-3.5 text-muted-foreground"
            aria-hidden
          />
        </div>
      }
    />
  );
}

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
    >
      <div
        aria-busy={controller.connectionsQuery.isPending}
        className="space-y-6"
      >
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
