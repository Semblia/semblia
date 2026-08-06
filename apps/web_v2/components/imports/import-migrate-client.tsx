"use client";

/**
 * Migrate a wall from another tool.
 *
 * Fifteen tools, previously behind a `<select>` labelled "Choose the tool" —
 * the single worst case for a dropdown, because the answer is a product whose
 * logo you know and whose exact spelling you may not. They are now a searchable
 * grid of marks. Then one URL; each testimonial keeps its original author and
 * date, and everything arrives pending review.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import type { V2ImportCatalogSourceDTO } from "@workspace/types";
import { DataState, GridSkeleton } from "@/components/shared";
import { importPath } from "@/lib/routes";
import { useDirectImportDialogController } from "./direct-import-dialog-controller";
import {
  ExistingConnections,
  HostMismatchNotice,
  ImportError,
  ImportSubmitActions,
  RightsConfirmation,
  SourceUrlField,
} from "./direct-import-form";
import { ImportMethodShell, MethodAside } from "./method-shell";
import { SourceChip, SourcePicker } from "./source-picker";
import { useHostMismatch, useMethodSources } from "./use-method-sources";

const STEPS = ["Choose the tool", "Point us at the wall"] as const;

export function ImportMigrateClient({ slug }: { slug: string }) {
  const { sources, state } = useMethodSources(slug, "MIGRATION");
  const [pickedKey, setPickedKey] = React.useState<string | null>(null);
  const source = sources.find((s) => s.key === pickedKey) ?? null;

  return (
    <ImportMethodShell
      slug={slug}
      title="Migrate a wall"
      description="Move a wall of love from another tool — authors and dates come along."
      steps={STEPS}
      currentStep={source ? 1 : 0}
      // The grid is the reason this page is full-bleed; the form that follows
      // it is not, so the measure arrives with the form.
      measure={Boolean(source)}
      aside={<MigrateAside />}
    >
      <DataState
        state={state}
        resource="migration sources"
        align="start"
        skeleton={<GridSkeleton tiles={10} />}
      >
        {source ? (
          <MigrateForm
            slug={slug}
            sources={sources}
            source={source}
            onPickSource={setPickedKey}
          />
        ) : (
          <SourcePicker
            sources={sources}
            label="Which tool is the wall on today?"
            searchPlaceholder="Search tools…"
            onPick={(s) => setPickedKey(s.key)}
          />
        )}
      </DataState>
    </ImportMethodShell>
  );
}

function MigrateForm({
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
    mode: "MIGRATION",
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
        changeLabel="Change tool"
      />
      <SourceUrlField controller={controller} />
      <p className="text-xs text-muted-foreground">{wallHint(source)}</p>
      {mismatch && (
        <HostMismatchNotice
          detected={mismatch}
          onSwitch={() => onPickSource(mismatch.key)}
        />
      )}
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

/** What a migration keeps, and what it cannot — stated once, beside the flow. */
function MigrateAside() {
  return (
    <MethodAside title="What comes across">
      <p>
        Each testimonial keeps its original author, role, company and date — a
        wall that all arrives stamped today is not proof of anything.
      </p>
      <p>
        Semblia reads the public wall or embed URL the tool serves. Anything
        behind a login on the old tool has to come across as a provider export
        instead, through Upload a spreadsheet.
      </p>
      <p>
        Everything lands pending your review, and duplicates of proof you
        already have are reported rather than added twice.
      </p>
    </MethodAside>
  );
}

/**
 * Where to find the address, in the tool's own terms. `reason` is the catalog's
 * own caveat for a best-effort migration and is the more useful sentence when
 * there is one; the host list is the fallback.
 */
function wallHint(source: V2ImportCatalogSourceDTO): string {
  if (source.reason) return source.reason;
  const hosts = source.publicHosts.join(", ");
  return hosts
    ? `Paste the public wall or embed URL — ${source.label} serves these on ${hosts}.`
    : `Paste the public wall or embed URL from ${source.label}.`;
}
