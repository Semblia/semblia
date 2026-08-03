"use client";

/**
 * Add proof manually.
 *
 * The old Import Center rendered thirteen tiles — Facebook, Instagram,
 * Slack, WhatsApp… — that all did exactly this. One capability wearing
 * thirteen costumes (2026-08-02 IA, P3). The platform survives here as what
 * it always was: optional attribution on the proof, not a decision the user
 * makes before they can start typing.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import type { V2ImportCatalogSourceDTO } from "@workspace/types";
import { DataState, ListSkeleton } from "@/components/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ImportMethodShell } from "./method-shell";
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
            <Select value={source.key} onValueChange={setSourceKey}>
              <SelectTrigger id="import-manual-source" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sources.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
