"use client";

/**
 * Import from the web.
 *
 * Two steps: name the source, then paste the link. The source used to be a
 * `<select>` sitting under the URL field, defaulted to whichever source
 * happened to be first in the catalog, and the submit was silently gated until
 * something committed it — so the screen opened on a form you could fill in
 * completely and still not send. Naming the source first removes the gate
 * entirely: by the time the URL field exists, the thing it belongs to is known.
 *
 * Host detection survives as what it is actually good at — catching a mistake.
 * Paste a Reddit link under Vimeo and the form says so and offers the switch,
 * rather than silently retargeting the import.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import type { V2ImportCatalogSourceDTO } from "@workspace/types";
import { DataState, GridSkeleton } from "@/components/shared";
import { importPath } from "@/lib/routes";
import { useDirectImportDialogController } from "./direct-import-dialog-controller";
import {
  AutoSyncControl,
  ExistingConnections,
  HostMismatchNotice,
  ImportError,
  ImportSubmitActions,
  RightsConfirmation,
  SourceUrlField,
} from "./direct-import-form";
import { ImportMethodShell } from "./method-shell";
import { SourceChip, SourcePicker } from "./source-picker";
import { useHostMismatch, useMethodSources } from "./use-method-sources";

const STEPS = ["Choose a source", "Paste the link"] as const;

export function ImportWebClient({ slug }: { slug: string }) {
  const { sources, state } = useMethodSources(slug, "PUBLIC_URL");
  const [pickedKey, setPickedKey] = React.useState<string | null>(null);
  const source = sources.find((s) => s.key === pickedKey) ?? null;

  return (
    <ImportMethodShell
      slug={slug}
      title="Import from the web"
      description="Paste a public link — only what the source publishes openly is read."
      steps={STEPS}
      currentStep={source ? 1 : 0}
    >
      <DataState
        state={state}
        resource="public sources"
        align="start"
        skeleton={<GridSkeleton tiles={4} />}
      >
        {source ? (
          <WebForm
            slug={slug}
            sources={sources}
            source={source}
            onPickSource={setPickedKey}
          />
        ) : (
          <SourcePicker
            sources={sources}
            label="Where does the proof live?"
            searchPlaceholder="Search sources…"
            onPick={(s) => setPickedKey(s.key)}
          />
        )}
      </DataState>
    </ImportMethodShell>
  );
}

function WebForm({
  slug,
  sources,
  source,
  onPickSource,
}: {
  slug: string;
  sources: V2ImportCatalogSourceDTO[];
  source: V2ImportCatalogSourceDTO;
  onPickSource: (key: string | null) => void;
}) {
  const router = useRouter();
  const controller = useDirectImportDialogController({
    slug,
    source,
    mode: "PUBLIC_URL",
    onOpenChange: (open) => {
      if (!open) router.push(importPath(slug));
    },
  });

  const mismatch = useHostMismatch(sources, controller.sourceUrl, source);

  return (
    <form onSubmit={controller.handleSubmit} className="space-y-5">
      <SourceChip
        source={source}
        onChange={() => onPickSource(null)}
        changeLabel="Change source"
      />
      <SourceUrlField controller={controller} />
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {sourceHostHint(source)}
      </p>
      {mismatch && (
        <HostMismatchNotice
          detected={mismatch}
          onSwitch={() => onPickSource(mismatch.key)}
        />
      )}
      <AutoSyncControl controller={controller} />
      <RightsConfirmation controller={controller} />
      <ImportError controller={controller} />
      <ImportSubmitActions controller={controller} />
      <ExistingConnections
        controller={controller}
        source={source}
        slug={slug}
      />
    </form>
  );
}

function sourceHostHint(source: V2ImportCatalogSourceDTO): string {
  const hosts = source.publicHosts.join(", ");
  return hosts
    ? `${source.label} links on ${hosts}.`
    : `Reads public proof from ${source.label}.`;
}
