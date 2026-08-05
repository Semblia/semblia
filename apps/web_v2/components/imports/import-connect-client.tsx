"use client";

/**
 * Connect a platform — the one import method that keeps working after today.
 *
 * Two steps: pick the platform from a grid of marks, then set it up. Picking
 * drills into `?source=<key>` — a URL, so the OAuth round-trip and a refresh
 * both land back on the same screen.
 *
 * Every connectable provider currently reports the same setup caveat. Said once
 * above the grid it is information; repeated under five tiles it is wallpaper,
 * so the tiles carry only an availability dot and the shared sentence is
 * hoisted (the hoisting rule the old Import Center learned the hard way).
 */

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { V2ImportCatalogSourceDTO } from "@workspace/types";
import { DataState, GridSkeleton } from "@/components/shared";
import { useConnectedImportDialogController } from "./connected-import-dialog-controller";
import { ConnectedImportContent } from "./connected-import-dialog-sections";
import { ImportMethodShell } from "./method-shell";
import { SourceChip, SourcePicker } from "./source-picker";
import { useMethodSources } from "./use-method-sources";
import { importConnectPath } from "@/lib/routes";

const STEPS = ["Choose a platform", "Connect it"] as const;

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

  const sharedReason = dominantReason(sources);

  return (
    <ImportMethodShell
      slug={slug}
      title="Connect a platform"
      description="Sign in once — Semblia imports new proof every six hours, pending review."
      steps={STEPS}
      currentStep={0}
    >
      <DataState
        state={state}
        resource="connectable platforms"
        align="start"
        skeleton={<GridSkeleton tiles={4} />}
      >
        {sharedReason && (
          <p className="mb-4 max-w-prose text-xs leading-relaxed text-muted-foreground">
            {sharedReason}
          </p>
        )}
        <SourcePicker
          sources={sources}
          label="Which platform?"
          onPick={(s) =>
            router.push(`${importConnectPath(slug)}?source=${s.key}`)
          }
        />
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
