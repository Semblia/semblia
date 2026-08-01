"use client";

/**
 * Import from the web.
 *
 * The URL leads (the Senja model): paste a public link and the source is
 * detected from its host. The source select stays visible — detection that
 * can't be corrected is a trap — but it follows the URL until the user
 * overrides it. Sources appear here because they can be *read*, not as a
 * catalog to browse (2026-08-02 IA, P1/P4).
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
  AutoSyncControl,
  ExistingConnections,
  Field,
  ImportError,
  ImportSubmitActions,
  RightsConfirmation,
  SourceUrlField,
} from "./direct-import-form";
import { ImportMethodShell } from "./method-shell";
import { matchSourceByUrl, useMethodSources } from "./use-method-sources";

export function ImportWebClient({ slug }: { slug: string }) {
  const { sources, state } = useMethodSources(slug, "PUBLIC_URL");

  return (
    <ImportMethodShell
      slug={slug}
      title="Import from the web"
      description="Paste a public link — only what the source publishes openly is read."
    >
      <DataState
        state={state}
        resource="public sources"
        align="start"
        skeleton={<ListSkeleton rows={4} leading="none" density="dense" />}
      >
        <WebForm slug={slug} sources={sources} />
      </DataState>
    </ImportMethodShell>
  );
}

function WebForm({
  slug,
  sources,
}: {
  slug: string;
  sources: V2ImportCatalogSourceDTO[];
}) {
  const router = useRouter();
  const [pickedKey, setPickedKey] = React.useState<string | null>(null);
  const [detectedKey, setDetectedKey] = React.useState<string | null>(null);

  // The user's explicit pick wins; detection fills the gap.
  const activeKey = pickedKey ?? detectedKey;
  const source = sources.find((s) => s.key === activeKey) ?? sources[0];

  const controller = useDirectImportDialogController({
    slug,
    source,
    mode: "PUBLIC_URL",
    onOpenChange: (open) => {
      if (!open) router.push(importPath(slug));
    },
  });

  // Follow the pasted URL. Detection updates the select; it never overrides
  // a manual pick (pickedKey), and it clears when the URL stops matching.
  const { sourceUrl } = controller;
  React.useEffect(() => {
    const match = matchSourceByUrl(sources, sourceUrl);
    setDetectedKey(match?.key ?? null);
  }, [sources, sourceUrl]);

  const detected = !pickedKey && detectedKey && source?.key === detectedKey;
  const committed = Boolean(pickedKey ?? detectedKey);
  // No confirmed source yet → the submit stays off, with the reason beside
  // the select rather than in a tooltip on a disabled button.
  const gated = {
    ...controller,
    submitDisabled: controller.submitDisabled || !committed,
  };

  if (!source) return null;

  return (
    <form onSubmit={controller.handleSubmit} className="space-y-5">
      <SourceUrlField controller={controller} />
      <Field label="Source" htmlFor="import-web-source">
        <>
          <Select
            value={activeKey ?? ""}
            onValueChange={(key) => setPickedKey(key)}
          >
            <SelectTrigger id="import-web-source" className="w-full">
              <SelectValue placeholder="Detected from the link, or choose" />
            </SelectTrigger>
            <SelectContent>
              {sources.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {detected
              ? `Detected ${source.label} from the link.`
              : committed
                ? sourceHostHint(source)
                : "Paste a link above and Semblia will recognize the source, or choose one."}
          </p>
        </>
      </Field>
      <AutoSyncControl controller={controller} />
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

function sourceHostHint(source: V2ImportCatalogSourceDTO): string {
  const hosts = source.publicHosts.join(", ");
  return hosts
    ? `${source.label} links on ${hosts}.`
    : `Reads public proof from ${source.label}.`;
}
