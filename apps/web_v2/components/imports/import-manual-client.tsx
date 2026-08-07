"use client";

/**
 * Add proof manually.
 *
 * The one method with no source gate: the platform here is optional
 * attribution on the proof, not a decision that has to be made before you can
 * start typing. So this page stays a single form and does not pretend to be a
 * sequence — a step rail over one screen is furniture.
 *
 * What it does share with the other methods is how you name a platform. The
 * attribution field was a `<select>` of roughly forty text labels; it is now
 * the same searchable grid of marks the other methods open with, behind a
 * trigger that shows the current choice.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import type { V2ImportCatalogSourceDTO } from "@workspace/types";
import { DataState, ListSkeleton } from "@/components/shared";
import { importPath } from "@/lib/routes";
import { useDirectImportDialogController } from "./direct-import-dialog-controller";
import {
  Field,
  ImportError,
  ImportSubmitActions,
  ManualImportFields,
  RightsConfirmation,
  SourceUrlField,
} from "./direct-import-form";
import { ImportMethodShell, MethodAside } from "./method-shell";
import { SourceSelect } from "./source-picker";
import { useMethodSources } from "./use-method-sources";

/** The plain-text source is the default; platforms are attribution. */
function defaultManualSource(sources: V2ImportCatalogSourceDTO[]) {
  return (
    sources.find((s) => s.key === "manual") ??
    sources.find((s) => s.label.toLocaleLowerCase().includes("manual")) ??
    sources[0] ??
    null
  );
}

export function ImportManualClient({ slug }: { slug: string }) {
  const { sources, state } = useMethodSources(slug, "MANUAL");

  return (
    <ImportMethodShell
      slug={slug}
      title="Add proof manually"
      description="Paste proof you have the right to use — it stays private until reviewed."
      measure
      aside={<ManualAside />}
    >
      <DataState
        state={state}
        resource="import sources"
        align="start"
        skeleton={<ListSkeleton rows={4} leading="none" density="dense" />}
      >
        <ManualForm slug={slug} sources={sources} />
      </DataState>
    </ImportMethodShell>
  );
}

/** The one method where the rights question is entirely on the person typing. */
function ManualAside() {
  return (
    <MethodAside title="Before you paste">
      <p>
        Use the author&apos;s own words. A source link is optional here and
        nothing verifies it, so this proof rests on your own record of where it
        came from.
      </p>
      <p>
        Attribution is optional and cosmetic — naming the platform it first
        appeared on does not connect Semblia to that platform.
      </p>
      <p>
        Like every other method, what you add arrives pending review and is not
        shown anywhere until you approve it.
      </p>
    </MethodAside>
  );
}

function ManualForm({
  slug,
  sources,
}: {
  slug: string;
  sources: V2ImportCatalogSourceDTO[];
}) {
  const router = useRouter();
  const fallback = defaultManualSource(sources);
  const [sourceKey, setSourceKey] = React.useState<string | null>(null);
  const source =
    (sourceKey && sources.find((s) => s.key === sourceKey)) || fallback;

  const controller = useDirectImportDialogController({
    slug,
    // `fallback` can only be null when the catalog offers no manual source at
    // all, in which case DataState never mounts this form (count is 0).
    source: source as V2ImportCatalogSourceDTO,
    mode: "MANUAL",
    onOpenChange: (open) => {
      if (!open) router.push(importPath(slug));
    },
  });

  if (!source) return null;

  return (
    <form onSubmit={controller.handleSubmit} className="space-y-5">
      <ManualImportFields controller={controller} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Where is this from?" htmlFor="import-manual-source">
          <>
            <SourceSelect
              id="import-manual-source"
              sources={sources}
              value={source}
              onPick={(picked) => setSourceKey(picked.key)}
              triggerLabel={`Where is this from? ${source.label}`}
              pickerLabel="Attribute this proof to"
            />
            <p className="text-xs text-muted-foreground">
              Optional attribution — the platform the proof first appeared on.
            </p>
          </>
        </Field>
      </div>
      <SourceUrlField controller={controller} />
      <RightsConfirmation controller={controller} />
      <ImportError controller={controller} />
      <ImportSubmitActions controller={controller} />
    </form>
  );
}
