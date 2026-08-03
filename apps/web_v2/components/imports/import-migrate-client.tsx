"use client";

/**
 * Migrate a wall from another tool.
 *
 * A short list of tools we can migrate from, then one URL. Each testimonial
 * keeps its original author and date; everything arrives pending review.
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
  ExistingConnections,
  Field,
  ImportError,
  ImportSubmitActions,
  RightsConfirmation,
  SourceUrlField,
} from "./direct-import-form";
import { ImportMethodShell } from "./method-shell";
import { matchSourceByUrl, useMethodSources } from "./use-method-sources";

export function ImportMigrateClient({ slug }: { slug: string }) {
  const { sources, state } = useMethodSources(slug, "MIGRATION");

  return (
    <ImportMethodShell
      slug={slug}
      title="Migrate a wall"
      description="Move a wall of love from another tool — authors and dates come along."
    >
      <DataState
        state={state}
        resource="migration sources"
        align="start"
        skeleton={<ListSkeleton rows={3} leading="none" density="dense" />}
      >
        <MigrateForm slug={slug} sources={sources} />
      </DataState>
    </ImportMethodShell>
  );
}

function MigrateForm({
  slug,
  sources,
}: {
  slug: string;
  sources: V2ImportCatalogSourceDTO[];
}) {
  const router = useRouter();
  const [pickedKey, setPickedKey] = React.useState<string | null>(null);
  const [detectedKey, setDetectedKey] = React.useState<string | null>(null);

  const activeKey = pickedKey ?? detectedKey;
  const source = sources.find((s) => s.key === activeKey) ?? sources[0];

  const controller = useDirectImportDialogController({
    slug,
    source,
    mode: "MIGRATION",
    onOpenChange: (open) => {
      if (!open) router.push(importPath(slug));
    },
  });

  const { sourceUrl } = controller;
  React.useEffect(() => {
    const match = matchSourceByUrl(sources, sourceUrl);
    setDetectedKey(match?.key ?? null);
  }, [sources, sourceUrl]);

  const committed = Boolean(pickedKey ?? detectedKey);
  const gated = {
    ...controller,
    submitDisabled: controller.submitDisabled || !committed,
  };

  if (!source) return null;

  return (
    <form onSubmit={controller.handleSubmit} className="space-y-5">
      <Field label="Migrating from" htmlFor="import-migrate-source">
        <>
          <Select
            value={activeKey ?? ""}
            onValueChange={(key) => setPickedKey(key)}
          >
            <SelectTrigger id="import-migrate-source" className="w-full">
              <SelectValue placeholder="Choose the tool" />
            </SelectTrigger>
            <SelectContent>
              {sources.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* The disabled submit's reason, stated where the fix is. */}
          {!committed && (
            <p className="text-xs text-muted-foreground">
              Choose the tool the wall lives on — or paste its URL below and
              Semblia will recognize it.
            </p>
          )}
        </>
      </Field>
      <SourceUrlField controller={controller} />
      <RightsConfirmation controller={controller} />
      <ImportError controller={gated} />
      <ImportSubmitActions controller={gated} />
      <ExistingConnections
        controller={controller}
        source={source}
        slug={slug}
      />
    </form>
  );
}
